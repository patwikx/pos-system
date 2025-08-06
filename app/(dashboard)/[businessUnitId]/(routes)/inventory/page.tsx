import { format } from "date-fns";
import { headers } from "next/headers";
import prismadb from "@/lib/db";

import { InventoryItemColumn } from "./components/columns";
import { InventoryClient } from "./components/client";

export default async function InventoryPage({
  params
}: {
  params: Promise<{ businessUnitId: string }>;
}) {
  // Await params (fix for Next.js 14+)
  const { businessUnitId } = await params;

  // Optional: also read from headers for consistency with other pages
  const headersList = await headers();
  const headerBusinessUnitId = headersList.get("x-business-unit-id") || businessUnitId;

  const inventoryItems = await prismadb.inventoryItem.findMany({
    where: {
      businessUnitId: headerBusinessUnitId
    },
    include: {
      uom: true,
      stockLevels: {
        where: { businessUnitId: headerBusinessUnitId }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  const formattedInventoryItems: InventoryItemColumn[] = inventoryItems.map((item) => {
    const stock = item.stockLevels[0]; // Get the stock record for this BU
    return {
      id: item.id,
      name: item.name,
      uom: item.uom.symbol,
      quantityOnHand: stock?.quantityOnHand || 0,
      isLowStock: stock ? stock.quantityOnHand <= stock.reorderPoint : false,
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
