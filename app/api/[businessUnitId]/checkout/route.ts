import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prismadb from '@/lib/db';

// Define the shape of the payment data coming from the form
interface PaymentData {
    amount: number;
    referenceNumber?: string;
}

export async function POST(
  req: Request,
  { params }: { params: { businessUnitId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return new NextResponse("Unauthenticated", { status: 401 });

    const body = await req.json();
    const { orderId, payments, businessPartnerId } = body as {
        orderId: string;
        payments: PaymentData[];
        businessPartnerId?: string;
    };

    if (!orderId) return new NextResponse("Order ID is required", { status: 400 });
    if (!payments || payments.length === 0) return new NextResponse("Payment information is required", { status: 400 });

    const order = await prismadb.order.findUnique({
        where: { id: orderId },
    });

    if (!order) return new NextResponse("Order not found", { status: 404 });

    // Use a transaction to ensure all database operations succeed or fail together
    await prismadb.$transaction(async (tx) => {
        // 1. Create the Payment records
        for (const payment of payments) {
            await tx.payment.create({
                data: {
                    orderId: orderId,
                    amount: payment.amount,
                    referenceNumber: payment.referenceNumber,
                    processedByUserId: session.user!.id,
                    paymentMethodId: payment.referenceNumber!, // Assuming referenceNumber is used as payment method ID
                    shiftId: order.shiftId!, // Assuming shiftId is always present on an order being paid
                }
            });
        }
        
        // 2. Update the Order
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        await tx.order.update({
            where: { id: orderId },
            data: {
                isPaid: true,
                status: 'PAID',
                amountPaid: order.amountPaid + totalPaid,
                businessPartnerId: businessPartnerId,
            }
        });

        // 3. Create the Journal Entry for the sale
        const cashAccount = await tx.glAccount.findFirst({ where: { businessUnitId: params.businessUnitId, name: 'Cash on Hand' }});
        const salesAccount = await tx.glAccount.findFirst({ where: { businessUnitId: params.businessUnitId, name: 'Sales Revenue' }});
        // You would also have an account for "Tax Payable"
        
        if (cashAccount && salesAccount) {
            await tx.journalEntry.create({
                data: {
                    date: new Date(),
                    description: `Sale for Order #${order.id.slice(-6)}`,
                    businessUnitId: params.businessUnitId,
                    status: 'POSTED', // Auto-post sales journals
                    authorId: session.user!.id,
                    accountingPeriodId: (await tx.accountingPeriod.findFirst({ where: { status: 'OPEN', businessUnitId: params.businessUnitId }}))!.id,
                    lines: {
                        create: [
                            // Debit Cash (Asset increases)
                            { accountId: cashAccount.id, debit: order.totalAmount },
                            // Credit Sales Revenue (Revenue increases)
                            { accountId: salesAccount.id, credit: order.subTotal },
                            // Credit Tax Payable (Liability increases)
                            // { accountId: taxPayableAccount.id, credit: order.tax }
                        ]
                    }
                }
            });
        }
    });
    
    return new NextResponse("Payment processed successfully", { status: 200 });

  } catch (error) {
    console.log('[CHECKOUT_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};