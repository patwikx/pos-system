import prismadb from "@/lib/db";
import { InventoryItemForm } from "./components/inventory-item-form";

interface InventoryItemPageProps {
  params: { 
    inventoryItemId: string;
  }
}

export default async function InventoryItemPage({ params }: InventoryItemPageProps) {
  // Fetch only the master item data. Stock levels are no longer needed here.
  const inventoryItem = params.inventoryItemId === 'new' 
    ? null 
    : await prismadb.inventoryItem.findUnique({
        where: {
          id: params.inventoryItemId,
        },
      });

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