import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prismadb from '@/lib/db';

export async function PATCH(
  req: Request,
  context: { params: Promise<{ businessUnitId: string; entryId: string }> }
) {
  try {
    const { businessUnitId, entryId } = await context.params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    const body = await req.json();
    const { postingDate, remarks, lines } = body;

    if (!postingDate) return new NextResponse("Posting date is required", { status: 400 });
    if (!lines || lines.length < 2) return new NextResponse("At least 2 journal lines are required", { status: 400 });

    // Validate that debits equal credits
    const totalDebits = lines.reduce((sum: number, line: any) => sum + (line.debit || 0), 0);
    const totalCredits = lines.reduce((sum: number, line: any) => sum + (line.credit || 0), 0);
    
    if (Math.abs(totalDebits - totalCredits) >= 0.01) {
      return new NextResponse("Total debits must equal total credits", { status: 400 });
    }

    // Check if journal entry exists and is editable
    const existingEntry = await prismadb.journalEntry.findUnique({
      where: { id: entryId, businessUnitId },
      include: { lines: true }
    });

    if (!existingEntry) {
      return new NextResponse("Journal entry not found", { status: 404 });
    }

    const journalEntry = await prismadb.$transaction(async (tx) => {
      // Reverse the old balances
      for (const oldLine of existingEntry.lines) {
        const account = await tx.glAccount.findUnique({
          where: { accountCode: oldLine.glAccountCode },
          include: { accountType: true }
        });

        if (account) {
          let balanceChange = 0;
          
          if (['ASSET', 'EXPENSE'].includes(account.accountType.name)) {
            balanceChange = (oldLine.credit || 0) - (oldLine.debit || 0);
          } else {
            balanceChange = (oldLine.debit || 0) - (oldLine.credit || 0);
          }

          await tx.glAccount.update({
            where: { id: account.id },
            data: { balance: { increment: balanceChange } }
          });
        }
      }

      // Delete old lines
      await tx.journalEntryLine.deleteMany({
        where: { journalEntryId: entryId }
      });

      // Update journal entry and create new lines
      const entry = await tx.journalEntry.update({
        where: { id: entryId },
        data: {
          postingDate: new Date(postingDate),
          remarks,
          lines: {
            create: lines.map((line: any) => ({
              glAccountCode: line.glAccountCode,
              debit: line.debit,
              credit: line.credit,
            }))
          }
        },
        include: {
          author: { select: { id: true, name: true } },
          approver: { select: { id: true, name: true } },
          lines: {
            include: {
              glAccount: true
            }
          },
          businessUnit: { select: { id: true, name: true } },
          accountingPeriod: { select: { id: true, name: true } }
        }
      });

      // Apply new balances
      for (const line of lines) {
        const account = await tx.glAccount.findUnique({
          where: { accountCode: line.glAccountCode },
          include: { accountType: true }
        });

        if (account) {
          let balanceChange = 0;
          
          if (['ASSET', 'EXPENSE'].includes(account.accountType.name)) {
            balanceChange = (line.debit || 0) - (line.credit || 0);
          } else {
            balanceChange = (line.credit || 0) - (line.debit || 0);
          }

          await tx.glAccount.update({
            where: { id: account.id },
            data: { balance: { increment: balanceChange } }
          });
        }
      }

      return entry;
    });

    return NextResponse.json(journalEntry);
  } catch (error) {
    console.log('[JOURNAL_ENTRY_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ businessUnitId: string; entryId: string }> }
) {
  try {
    const { businessUnitId, entryId } = await context.params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    // Get the journal entry with lines
    const journalEntry = await prismadb.journalEntry.findUnique({
      where: { id: entryId, businessUnitId },
      include: { lines: true }
    });

    if (!journalEntry) {
      return new NextResponse("Journal entry not found", { status: 404 });
    }

    await prismadb.$transaction(async (tx) => {
      // Reverse the account balances
      for (const line of journalEntry.lines) {
        const account = await tx.glAccount.findUnique({
          where: { accountCode: line.glAccountCode },
          include: { accountType: true }
        });

        if (account) {
          let balanceChange = 0;
          
          if (['ASSET', 'EXPENSE'].includes(account.accountType.name)) {
            balanceChange = (line.credit || 0) - (line.debit || 0);
          } else {
            balanceChange = (line.debit || 0) - (line.credit || 0);
          }

          await tx.glAccount.update({
            where: { id: account.id },
            data: { balance: { increment: balanceChange } }
          });
        }
      }

      // Delete the journal entry (lines will be deleted by cascade)
      await tx.journalEntry.delete({
        where: { id: entryId }
      });
    });

    return NextResponse.json({ message: 'Journal entry deleted successfully' });
  } catch (error) {
    console.log('[JOURNAL_ENTRY_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(
  req: Request,
  context: { params: Promise<{ businessUnitId: string; entryId: string }> }
) {
  try {
    const { businessUnitId, entryId } = await context.params;

    const journalEntry = await prismadb.journalEntry.findUnique({
      where: { 
        id: entryId,
        businessUnitId 
      },
      include: {
        author: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
        lines: {
          include: {
            glAccount: true
          }
        },
        businessUnit: { select: { id: true, name: true } },
        accountingPeriod: { select: { id: true, name: true } }
      }
    });

    if (!journalEntry) {
      return new NextResponse("Journal entry not found", { status: 404 });
    }

    return NextResponse.json(journalEntry);
  } catch (error) {
    console.log('[JOURNAL_ENTRY_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}