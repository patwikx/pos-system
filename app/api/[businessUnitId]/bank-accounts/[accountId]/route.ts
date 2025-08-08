import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prismadb from '@/lib/db';

export async function GET(
  req: Request,
  context: { params: Promise<{ businessUnitId: string; accountId: string }> }
) {
  try {
    const { businessUnitId, accountId } = await context.params;

    const bankAccount = await prismadb.bankAccount.findUnique({
      where: { 
        id: accountId,
        businessUnitId 
      },
      include: {
        glAccount: true,
        businessUnit: { select: { id: true, name: true } },
        incomingPayments: {
          include: {
            businessPartner: { select: { name: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        outgoingPayments: {
          include: {
            businessPartner: { select: { name: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        deposits: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        _count: {
          select: {
            incomingPayments: true,
            outgoingPayments: true,
            deposits: true
          }
        }
      }
    });

    if (!bankAccount) {
      return new NextResponse("Bank account not found", { status: 404 });
    }

    return NextResponse.json(bankAccount);
  } catch (error) {
    console.log('[BANK_ACCOUNT_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

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
    const { name, bankName, accountNumber, glAccountId } = body;

    if (!name) return new NextResponse("Account name is required", { status: 400 });
    if (!bankName) return new NextResponse("Bank name is required", { status: 400 });
    if (!accountNumber) return new NextResponse("Account number is required", { status: 400 });
    if (!glAccountId) return new NextResponse("GL Account is required", { status: 400 });

    // Check if account number already exists (excluding current account)
    const existingAccount = await prismadb.bankAccount.findFirst({
      where: { 
        accountNumber,
        NOT: { id: accountId }
      }
    });

    if (existingAccount) {
      return new NextResponse("Account number already exists", { status: 409 });
    }

    const bankAccount = await prismadb.bankAccount.update({
      where: { 
        id: accountId,
        businessUnitId 
      },
      data: {
        name,
        bankName,
        accountNumber,
        glAccountId
      },
      include: {
        glAccount: true,
        businessUnit: { select: { id: true, name: true } },
        _count: {
          select: {
            incomingPayments: true,
            outgoingPayments: true,
            deposits: true
          }
        }
      }
    });

    return NextResponse.json(bankAccount);
  } catch (error) {
    console.log('[BANK_ACCOUNT_PATCH]', error);
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

    // Check if bank account has transactions
    const [incomingCount, outgoingCount, depositCount] = await Promise.all([
      prismadb.incomingPayment.count({ where: { bankAccountId: accountId } }),
      prismadb.outgoingPayment.count({ where: { bankAccountId: accountId } }),
      prismadb.deposit.count({ where: { bankAccountId: accountId } })
    ]);

    if (incomingCount > 0 || outgoingCount > 0 || depositCount > 0) {
      return new NextResponse("Cannot delete bank account with existing transactions", { status: 409 });
    }

    const bankAccount = await prismadb.bankAccount.delete({
      where: { 
        id: accountId,
        businessUnitId 
      }
    });

    return NextResponse.json(bankAccount);
  } catch (error) {
    console.log('[BANK_ACCOUNT_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}