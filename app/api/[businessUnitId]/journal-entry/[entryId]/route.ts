import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prismadb from '@/lib/db';

export async function POST(
  req: Request,
  context: { params: Promise<{ businessUnitId: string }> }
) {
  try {
    const { businessUnitId } = await context.params;
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

    // Get next document number
    const series = await prismadb.numberingSeries.findUnique({
      where: {
        documentType_businessUnitId: {
          documentType: 'JOURNAL_ENTRY',
          businessUnitId
        }
      }
    });

    if (!series) {
      return new NextResponse("Numbering series not found", { status: 404 });
    }

    const docNum = `${series.prefix}${series.nextNumber}`;

    const journalEntry = await prismadb.$transaction(async (tx) => {
      // Create journal entry
      const entry = await tx.journalEntry.create({
        data: {
          docNum,
          postingDate: new Date(postingDate),
          remarks,
          authorId: session.user!.id,
          businessUnitId,
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
          lines: {
            include: {
              glAccount: true
            }
          }
        }
      });

      // Update account balances
      for (const line of lines) {
        const account = await tx.glAccount.findUnique({
          where: { accountCode: line.glAccountCode },
          include: { accountType: true }
        });

        if (account) {
          let balanceChange = 0;
          
          // Determine balance change based on account type
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

      // Update numbering series
      await tx.numberingSeries.update({
        where: { id: series.id },
        data: { nextNumber: { increment: 1 } }
      });

      return entry;
    });

    return NextResponse.json(journalEntry);
  } catch (error) {
    console.log('[JOURNAL_ENTRY_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(
  req: Request,
  context: { params: Promise<{ businessUnitId: string }> }
) {
  try {
    const { businessUnitId } = await context.params;

    const journalEntries = await prismadb.journalEntry.findMany({
      where: { businessUnitId },
      include: {
        author: { select: { id: true, name: true } },
        lines: {
          include: {
            glAccount: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(journalEntries);
  } catch (error) {
    console.log('[JOURNAL_ENTRY_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}