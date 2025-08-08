import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prismadb from '@/lib/db';

export async function PATCH(
  req: Request,
  context: { params: Promise<{ businessUnitId: string; partnerId: string }> }
) {
  try {
    const { businessUnitId, partnerId } = await context.params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    const body = await req.json();
    const { bpCode, name, type, phone, email } = body;

    if (!name) return new NextResponse("Name is required", { status: 400 });
    if (!type) return new NextResponse("Type is required", { status: 400 });

    // Check if BP code already exists (excluding current partner)
    if (bpCode) {
      const existingPartner = await prismadb.businessPartner.findFirst({
        where: { 
          bpCode,
          NOT: { id: partnerId }
        }
      });

      if (existingPartner) {
        return new NextResponse("Business partner code already exists", { status: 409 });
      }
    }

    const businessPartner = await prismadb.businessPartner.update({
      where: { 
        id: partnerId,
        businessUnitId 
      },
      data: {
        bpCode,
        name,
        type,
        phone,
        email
      }
    });

    return NextResponse.json(businessPartner);
  } catch (error) {
    console.log('[BUSINESS_PARTNER_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ businessUnitId: string; partnerId: string }> }
) {
  try {
    const { businessUnitId, partnerId } = await context.params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    // Check if partner has transactions
    const [arInvoices, apInvoices, orders] = await Promise.all([
      prismadb.aRInvoice.count({ where: { businessPartner: { id: partnerId } } }),
      prismadb.aPInvoice.count({ where: { businessPartner: { id: partnerId } } }),
      prismadb.order.count({ where: { businessPartner: { id: partnerId } } })
    ]);

    if (arInvoices > 0 || apInvoices > 0 || orders > 0) {
      return new NextResponse("Cannot delete business partner with existing transactions", { status: 409 });
    }

    const businessPartner = await prismadb.businessPartner.delete({
      where: { 
        id: partnerId,
        businessUnitId 
      }
    });

    return NextResponse.json(businessPartner);
  } catch (error) {
    console.log('[BUSINESS_PARTNER_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}