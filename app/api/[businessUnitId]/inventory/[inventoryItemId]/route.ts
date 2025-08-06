import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prismadb from '@/lib/db';

export async function PATCH(
  req: Request,
  { params }: { params: { businessUnitId: string, inventoryItemId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return new NextResponse("Unauthenticated", { status: 401 });

    const body = await req.json();
    const { name, uomId, description, isActive } = body;

    if (!name) return new NextResponse("Name is required", { status: 400 });
    if (!uomId) return new NextResponse("Unit of Measure is required", { status: 400 });

    // This now ONLY updates the master inventory item's details.
    const updatedInventoryItem = await prismadb.inventoryItem.update({
      where: {
        id: params.inventoryItemId,
        businessUnitId: params.businessUnitId
      },
      data: { name, uomId, description, isActive }
    });
  
    return NextResponse.json(updatedInventoryItem);
  } catch (error) {
    console.log('[INVENTORY_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};

export async function DELETE(
  req: Request,
  context: { params: Promise<{ businessUnitId: string; inventoryItemId: string }> }
) {
  try {
    const { businessUnitId, inventoryItemId } = await context.params;

    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    // TODO: Authorization

    // Prevent deleting an item if it's used in a recipe
    const recipeUsage = await prismadb.recipeItem.findFirst({
      where: { inventoryItemId }
    });

    if (recipeUsage) {
      return new NextResponse("Cannot delete item. It is currently used in one or more recipes.", { status: 409 });
    }

    // Use a transaction to delete the item and its stock records
    const [, deletedInventoryItem] = await prismadb.$transaction([
      prismadb.inventoryStock.deleteMany({
        where: { inventoryItemId }
      }),
      prismadb.inventoryItem.delete({
        where: {
          id: inventoryItemId,
          businessUnitId,
        }
      })
    ]);

    return NextResponse.json(deletedInventoryItem);
  } catch (error) {
    console.log('[INVENTORY_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
