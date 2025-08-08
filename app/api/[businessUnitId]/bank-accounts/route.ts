import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createBankAccount, getBankAccounts } from '@/lib/actions/financials-actions';

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
    const { name, bankName, accountNumber, glAccountId } = body;

    if (!name) return new NextResponse("Account name is required", { status: 400 });
    if (!bankName) return new NextResponse("Bank name is required", { status: 400 });
    if (!accountNumber) return new NextResponse("Account number is required", { status: 400 });
    if (!glAccountId) return new NextResponse("GL Account is required", { status: 400 });

    const result = await createBankAccount({
      name,
      bankName,
      accountNumber,
      glAccountId,
      businessUnitId
    });

    if (result.success) {
      return NextResponse.json(result.data);
    } else {
      return new NextResponse(result.error, { status: 400 });
    }
  } catch (error) {
    console.log('[BANK_ACCOUNTS_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(
  req: Request,
  context: { params: Promise<{ businessUnitId: string }> }
) {
  try {
    const { businessUnitId } = await context.params;
    
    const bankAccounts = await getBankAccounts(businessUnitId);
    return NextResponse.json(bankAccounts);
  } catch (error) {
    console.log('[BANK_ACCOUNTS_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}