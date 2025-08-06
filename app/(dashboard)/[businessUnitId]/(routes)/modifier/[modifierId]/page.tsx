import prismadb from "@/lib/db";
import { headers } from "next/headers";
import { ModifierForm } from "./components/modifier-form";

// 1. Remove `params` from the function signature
export default async function ModifierPage() {
  // 2. Get the headers to find the businessUnitId and the current URL
  const headersList = await headers();
  const businessUnitId = headersList.get("x-business-unit-id");
  const pathname = headersList.get("next-url") || "";

  // 3. Extract the modifierId from the last segment of the URL
  // This will be either the unique ID or the word "new"
  const modifierId = pathname.split('/').pop();

  // Safety checks
  if (!businessUnitId || !modifierId) {
    return <div className="p-8">Error: Could not identify the business unit or modifier.</div>;
  }
  
  // 4. Use the extracted modifierId in the Prisma query
  const modifier = await prismadb.modifier.findUnique({
    where: { 
      id: modifierId 
    }
  });

  // Fetch all modifier groups for this business unit to populate the dropdown
  const modifierGroups = await prismadb.modifierGroup.findMany({
    where: { businessUnitId: businessUnitId }
  });

  // Fetch all InventoryItems for linking to stock
  const inventoryItems = await prismadb.inventoryItem.findMany({
    where: { businessUnitId: businessUnitId }
  });

  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <ModifierForm 
          initialData={modifier} 
          modifierGroups={modifierGroups}
          inventoryItems={inventoryItems}
        />
      </div>
    </div>
  );
}