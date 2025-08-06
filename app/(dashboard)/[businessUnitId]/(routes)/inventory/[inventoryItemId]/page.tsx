import prismadb from "@/lib/db";
import { InventoryItemForm } from "./components/inventory-item-form";

export default async function InventoryItemPage({
  params
}: {
  params: Promise<{ inventoryItemId: string; businessUnitId: string }>;
}) {
  // ✅ Await params
  const { inventoryItemId, businessUnitId } = await params;

  // Fetch the specific item to edit, including its stock level
  const inventoryItem = await prismadb.inventoryItem.findUnique({
    where: {
      id: inventoryItemId,
    },
    include: {
      stockLevels: {
        where: { businessUnitId }
      }
    }
  });

  // Fetch all Units of Measure for the dropdown
  const uoms = await prismadb.uoM.findMany();

  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <InventoryItemForm 
          uoms={uoms}
          initialData={inventoryItem}
        />
      </div>
    </div>
  );
}
