import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prismadb from '@/lib/db';

export async function PATCH(
  req: Request,
  context: { params: Promise<{ businessUnitId: string; accountId: string }> }
) {
  try {
    const { businessUnitId, accountId } = await context.params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    const body = await req.json();
    const { accountCode, name, accountTypeId, balance } = body;

    if (!accountCode) return new NextResponse("Account code is required", { status: 400 });
    if (!name) return new NextResponse("Account name is required", { status: 400 });
    if (!accountTypeId) return new NextResponse("Account type is required", { status: 400 });

    // Check if account code already exists (excluding current account)
    const existingAccount = await prismadb.glAccount.findFirst({
      where: { 
        accountCode,
        NOT: { id: accountId }
      }
    });

    if (existingAccount) {
      return new NextResponse("Account code already exists", { status: 409 });
    }

    const glAccount = await prismadb.glAccount.update({
      where: { 
        id: accountId,
        businessUnitId 
      },
      data: {
        accountCode,
        name,
        accountTypeId,
        balance,
      },
      include: {
        accountType: true,
        _count: {
          select: { journalLines: true }
        }
      }
    });

    return NextResponse.json(glAccount);
  } catch (error) {
    console.log('[CHART_OF_ACCOUNTS_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ businessUnitId: string; accountId: string }> }
) {
  try {
    const { businessUnitId, accountId } = await context.params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    // Check if account has transactions
    const transactionCount = await prismadb.journalEntryLine.count({
      where: { 
        glAccount: { id: accountId }
      }
    });

    if (transactionCount > 0) {
      return new NextResponse("Cannot delete account with existing transactions", { status: 409 });
    }

    const glAccount = await prismadb.glAccount.delete({
      where: { 
        id: accountId,
        businessUnitId 
      }
    });

    return NextResponse.json(glAccount);
  } catch (error) {
    console.log('[CHART_OF_ACCOUNTS_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}