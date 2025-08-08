import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createARInvoice, getARInvoices } from '@/lib/actions/financials-actions';
import { ARInvoiceFilters } from '@/types/financials-types';

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
    const { bpCode, baseDeliveryId, postingDate, dueDate, documentDate, remarks, items } = body;

    if (!bpCode) return new NextResponse("Customer is required", { status: 400 });
    if (!postingDate) return new NextResponse("Posting date is required", { status: 400 });
    if (!dueDate) return new NextResponse("Due date is required", { status: 400 });
    if (!items || items.length === 0) return new NextResponse("At least one item is required", { status: 400 });

    const result = await createARInvoice({
      businessUnitId,
      bpCode,
      baseDeliveryId,
      postingDate: new Date(postingDate),
      dueDate: new Date(dueDate),
      documentDate: new Date(documentDate),
      remarks,
      items
    });

    if (result.success) {
      return NextResponse.json(result.data);
    } else {
      return new NextResponse(result.error, { status: 400 });
    }
  } catch (error) {
    console.log('[AR_INVOICE_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(
  req: Request,
  context: { params: Promise<{ businessUnitId: string }> }
) {
  try {
    const { businessUnitId } = await context.params;
    const { searchParams } = new URL(req.url);
    
    const filters: ARInvoiceFilters = {
      businessUnitId,
      status: searchParams.get('status') as any,
      bpCode: searchParams.get('bpCode') || undefined,
      isPaid: searchParams.get('isPaid') === 'true' ? true : searchParams.get('isPaid') === 'false' ? false : undefined,
      overdue: searchParams.get('overdue') === 'true',
      searchTerm: searchParams.get('search') || undefined,
    };

    const pagination = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20')
    };

    const result = await getARInvoices(filters, pagination);
    return NextResponse.json(result);
  } catch (error) {
    console.log('[AR_INVOICE_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}