import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prismadb from '@/lib/db';

export async function GET(
  req: Request,
  context: { params: Promise<{ businessUnitId: string; paymentId: string }> }
) {
  try {
    const { businessUnitId, paymentId } = await context.params;

    const payment = await prismadb.outgoingPayment.findUnique({
      where: { 
        id: paymentId,
        businessUnitId 
      },
      include: {
        businessPartner: { select: { bpCode: true, name: true } },
        bankAccount: { select: { id: true, name: true } },
        journalEntry: {
          include: {
            lines: {
              include: {
                glAccount: true
              }
            }
          }
        }
      }
    });

    if (!payment) {
      return new NextResponse("Payment not found", { status: 404 });
    }

    return NextResponse.json(payment);
  } catch (error) {
    console.log('[OUTGOING_PAYMENT_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ businessUnitId: string; paymentId: string }> }
) {
  try {
    const { businessUnitId, paymentId } = await context.params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    const body = await req.json();
    const { bpCode, paymentDate, amount, bankAccountId } = body;

    if (!bpCode) return new NextResponse("Vendor is required", { status: 400 });
    if (!paymentDate) return new NextResponse("Payment date is required", { status: 400 });
    if (!amount || amount <= 0) return new NextResponse("Valid amount is required", { status: 400 });
    if (!bankAccountId) return new NextResponse("Bank account is required", { status: 400 });

    const payment = await prismadb.outgoingPayment.update({
      where: { 
        id: paymentId,
        businessUnitId 
      },
      data: {
        bpCode,
        paymentDate: new Date(paymentDate),
        amount,
        bankAccountId
      },
      include: {
        businessPartner: { select: { bpCode: true, name: true } },
        bankAccount: { select: { id: true, name: true } },
        journalEntry: true
      }
    });

    return NextResponse.json(payment);
  } catch (error) {
    console.log('[OUTGOING_PAYMENT_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ businessUnitId: string; paymentId: string }> }
) {
  try {
    const { businessUnitId, paymentId } = await context.params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    const payment = await prismadb.outgoingPayment.findUnique({
      where: { id: paymentId, businessUnitId },
      select: { journalEntryId: true }
    });

    if (!payment) {
      return new NextResponse("Payment not found", { status: 404 });
    }

    await prismadb.$transaction(async (tx) => {
      // Delete the payment
      await tx.outgoingPayment.delete({
        where: { id: paymentId }
      });

      // Delete associated journal entry if exists
      if (payment.journalEntryId) {
        await tx.journalEntry.delete({
          where: { id: payment.journalEntryId }
        });
      }
    });

    return NextResponse.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.log('[OUTGOING_PAYMENT_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}