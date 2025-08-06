import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prismadb from '@/lib/db';

// Handler for CREATING a new menu item
export async function POST(
  req: Request,
  context: { params: Promise<{ businessUnitId: string }> }
) {
  try {
    const { businessUnitId } = await context.params;
    const session = await auth();
    const body = await req.json();

    const { name, price, categoryId, description, imageUrl, isActive } = body;

    if (!session?.user?.id) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }
    if (!name) return new NextResponse("Name is required", { status: 400 });
    if (!price) return new NextResponse("Price is required", { status: 400 });
    if (!categoryId) return new NextResponse("Category ID is required", { status: 400 });
    if (!businessUnitId) return new NextResponse("Business Unit ID is required", { status: 400 });

    // TODO: Add authorization check to ensure user can create items in this business unit

    const menuItem = await prismadb.menuItem.create({
      data: {
        name,
        price,
        categoryId,
        description,
        imageUrl,
        isActive,
        businessUnitId, // Link to the business unit
      },
    });

    return NextResponse.json(menuItem);
  } catch (error) {
    console.log('[MENU_ITEMS_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

// Handler for GETTING all menu items for the business unit
export async function GET(
  req: Request,
  context: { params: Promise<{ businessUnitId: string }> }
) {
  try {
    const { businessUnitId } = await context.params;

    if (!businessUnitId) {
      return new NextResponse("Business Unit ID is required", { status: 400 });
    }

    const menuItems = await prismadb.menuItem.findMany({
      where: { businessUnitId },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(menuItems);
  } catch (error) {
    console.log('[MENU_ITEMS_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
