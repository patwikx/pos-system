import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prismadb from '@/lib/db';

// Handler for UPDATING an existing menu item
export async function PATCH(
  req: Request,
  context: { params: Promise<{ businessUnitId: string; menuItemId: string }> }
) {
  try {
    const { businessUnitId, menuItemId } = await context.params;
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    const body = await req.json();
    const { name, price, categoryId, description, imageUrl, isActive } = body;

    if (!name) return new NextResponse("Name is required", { status: 400 });
    if (!price) return new NextResponse("Price is required", { status: 400 });
    if (!categoryId) return new NextResponse("Category ID is required", { status: 400 });
    if (!menuItemId) return new NextResponse("Menu Item ID is required", { status: 400 });

    // TODO: Add authorization check

    const menuItem = await prismadb.menuItem.update({
      where: {
        id: menuItemId,
        businessUnitId,
      },
      data: { name, price, categoryId, description, imageUrl, isActive },
    });

    return NextResponse.json(menuItem);
  } catch (error) {
    console.log('[MENU_ITEM_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

// Handler for DELETING a menu item
export async function DELETE(
  req: Request,
  context: { params: Promise<{ businessUnitId: string; menuItemId: string }> }
) {
  try {
    const { businessUnitId, menuItemId } = await context.params;
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }
    if (!menuItemId) {
      return new NextResponse("Menu Item ID is required", { status: 400 });
    }

    // TODO: Add authorization check

    const menuItem = await prismadb.menuItem.delete({
      where: {
        id: menuItemId,
        businessUnitId,
      },
    });

    return NextResponse.json(menuItem);
  } catch (error) {
    console.log('[MENU_ITEM_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
