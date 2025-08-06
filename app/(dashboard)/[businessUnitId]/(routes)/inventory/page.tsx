import { format } from "date-fns";
import { headers } from "next/headers"; // 1. Import the `headers` function
import prismadb from "@/lib/db";

import { InventoryItemColumn } from "./components/columns";
import { InventoryClient } from "./components/client";

// 2. Remove `params` from the function signature
export default async function InventoryPage() {
  // 3. Read the businessUnitId from the custom header
  const headersList = await headers();
  const businessUnitId = headersList.get("x-business-unit-id");

  // 4. Add a safety check in case the header is missing
  if (!businessUnitId) {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <p>Error: Business Unit could not be identified.</p>
        </div>
    );
  }

  // The rest of the logic remains the same, using the businessUnitId from the header
  const inventoryItems = await prismadb.inventoryItem.findMany({
    where: {
      businessUnitId: businessUnitId
    },
    include: {
      uom: true,
      stockLevels: {
        where: {
          location: {
            businessUnitId: businessUnitId,
          },
        },
        include: {
          location: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  const formattedInventoryItems: InventoryItemColumn[] = inventoryItems.map((item) => {
    const totalQuantityOnHand = item.stockLevels.reduce(
      (sum, stock) => sum + stock.quantityOnHand,
      0
    );

    const totalReorderPoint = item.stockLevels.reduce(
      (sum, stock) => sum + stock.reorderPoint,
      0
    );

    const locations = item.stockLevels.map(stock => stock.location.name).join(', ');

    return {
      id: item.id,
      name: item.name,
      uom: item.uom.symbol,
      totalQuantityOnHand: totalQuantityOnHand,
      locations: locations || 'No locations',
      isLowStock: totalQuantityOnHand <= totalReorderPoint,
      createdAt: format(item.createdAt, "MMMM do, yyyy")
    };
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <InventoryClient data={formattedInventoryItems} />
      </div>
    </div>
  );
}