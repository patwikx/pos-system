import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prismadb from '@/lib/db';

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

    // TODO: Authorization

    const body = await req.json();
    const { name, uomId, quantityOnHand, reorderPoint, description, isActive } = body;

    if (!name) return new NextResponse("Name is required", { status: 400 });
    if (!uomId) return new NextResponse("Unit of Measure is required", { status: 400 });

    // Create the item and its stock level together
    const inventoryItem = await prismadb.inventoryItem.create({
      data: {
        businessUnitId,
        name,
        uomId,
        description,
        isActive,
        stockLevels: {
          create: {
            businessUnitId,
            quantityOnHand: quantityOnHand || 0,
            reorderPoint: reorderPoint || 0,
          }
        }
      }
    });

    return NextResponse.json(inventoryItem);
  } catch (error) {
    console.log('[INVENTORY_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
