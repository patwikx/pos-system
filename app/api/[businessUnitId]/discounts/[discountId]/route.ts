import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prismadb from '@/lib/db';

export async function PATCH(
  req: Request,
  context: { params: Promise<{ businessUnitId: string; discountId: string }> }
) {
  try {
    const { businessUnitId, discountId } = await context.params;

    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    const body = await req.json();
    const { name, value, type, description, isActive } = body;

    if (!name) return new NextResponse("Name is required", { status: 400 });
    if (value === undefined || value === null) return new NextResponse("Value is required", { status: 400 });
    if (!type) return new NextResponse("Type is required", { status: 400 });

    const discount = await prismadb.discount.update({
      where: {
        id: discountId,
        businessUnitId,
      },
      data: { name, value, type, description, isActive }
    });

    return NextResponse.json(discount);
  } catch (error) {
    console.log('[DISCOUNT_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ businessUnitId: string; discountId: string }> }
) {
  try {
    const { businessUnitId, discountId } = await context.params;

    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    // Prevent deleting a discount if it is attached to any order
    const orderExists = await prismadb.order.findFirst({
      where: { discountId }
    });
    if (orderExists) {
      return new NextResponse(
        "Cannot delete discount. It is currently applied to one or more orders.",
        { status: 409 }
      );
    }

    const discount = await prismadb.discount.delete({
      where: {
        id: discountId,
        businessUnitId,
      }
    });

    return NextResponse.json(discount);
  } catch (error) {
    console.log('[DISCOUNT_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
