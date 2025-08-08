import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createIncomingPayment } from '@/lib/actions/financials-actions';

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
    const { bpCode, paymentDate, amount, bankAccountId } = body;

    if (!bpCode) return new NextResponse("Customer is required", { status: 400 });
    if (!paymentDate) return new NextResponse("Payment date is required", { status: 400 });
    if (!amount || amount <= 0) return new NextResponse("Valid amount is required", { status: 400 });
    if (!bankAccountId) return new NextResponse("Bank account is required", { status: 400 });

    const result = await createIncomingPayment({
      businessUnitId,
      bpCode,
      paymentDate: new Date(paymentDate),
      amount,
      bankAccountId
    });

    if (result.success) {
      return NextResponse.json(result.data);
    } else {
      return new NextResponse(result.error, { status: 400 });
    }
  } catch (error) {
    console.log('[INCOMING_PAYMENTS_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}