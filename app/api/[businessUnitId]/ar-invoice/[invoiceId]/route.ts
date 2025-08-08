import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prismadb from '@/lib/db';

export async function GET(
  req: Request,
  context: { params: Promise<{ businessUnitId: string; invoiceId: string }> }
) {
  try {
    const { businessUnitId, invoiceId } = await context.params;

    const invoice = await prismadb.aRInvoice.findUnique({
      where: { 
        id: invoiceId,
        businessUnitId 
      },
      include: {
        businessPartner: { select: { bpCode: true, name: true } },
        businessUnit: { select: { id: true, name: true } },
        items: {
          include: {
            menuItem: { select: { id: true, name: true } },
            glAccount: { select: { id: true, accountCode: true, name: true } }
          }
        },
        journalEntry: true,
        baseDelivery: { select: { id: true, docNum: true } },
        orders: { select: { id: true, totalAmount: true } }
      }
    });

    if (!invoice) {
      return new NextResponse("Invoice not found", { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.log('[AR_INVOICE_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ businessUnitId: string; invoiceId: string }> }
) {
  try {
    const { businessUnitId, invoiceId } = await context.params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    const body = await req.json();
    const { bpCode, postingDate, dueDate, documentDate, remarks, items } = body;

    if (!bpCode) return new NextResponse("Customer is required", { status: 400 });
    if (!postingDate) return new NextResponse("Posting date is required", { status: 400 });
    if (!dueDate) return new NextResponse("Due date is required", { status: 400 });

    const totalAmount = items?.reduce((sum: number, item: any) => sum + item.lineTotal, 0) || 0;

    const invoice = await prismadb.aRInvoice.update({
      where: { 
        id: invoiceId,
        businessUnitId 
      },
      data: {
        bpCode,
        postingDate: new Date(postingDate),
        dueDate: new Date(dueDate),
        documentDate: new Date(documentDate),
        remarks,
        totalAmount
      },
      include: {
        businessPartner: { select: { bpCode: true, name: true } },
        businessUnit: { select: { id: true, name: true } },
        items: {
          include: {
            menuItem: { select: { id: true, name: true } },
            glAccount: { select: { id: true, accountCode: true, name: true } }
          }
        },
        journalEntry: true,
        baseDelivery: { select: { id: true, docNum: true } },
        orders: { select: { id: true, totalAmount: true } }
      }
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.log('[AR_INVOICE_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ businessUnitId: string; invoiceId: string }> }
) {
  try {
    const { businessUnitId, invoiceId } = await context.params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    // Check if invoice has payments
    const invoice = await prismadb.aRInvoice.findUnique({
      where: { id: invoiceId, businessUnitId },
      select: { amountPaid: true, journalEntryId: true }
    });

    if (!invoice) {
      return new NextResponse("Invoice not found", { status: 404 });
    }

    if (invoice.amountPaid > 0) {
      return new NextResponse("Cannot delete invoice with payments", { status: 409 });
    }

    await prismadb.$transaction(async (tx) => {
      // Delete the invoice (items will be deleted by cascade)
      await tx.aRInvoice.delete({
        where: { id: invoiceId }
      });

      // Delete associated journal entry if exists
      if (invoice.journalEntryId) {
        await tx.journalEntry.delete({
          where: { id: invoice.journalEntryId }
        });
      }
    });

    return NextResponse.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.log('[AR_INVOICE_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}