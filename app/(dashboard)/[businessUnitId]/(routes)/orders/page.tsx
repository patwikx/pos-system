import { headers } from "next/headers";
import { format } from "date-fns";
import prismadb from "@/lib/db";
import { formatter } from "@/lib/utils";

import { OrderColumn } from "./components/columns";
import { OrdersClient } from "./components/client";

export default async function OrdersPage() {
  // Read the businessUnitId from the request headers
  const headersList = await headers();
  const businessUnitId = headersList.get("x-business-unit-id");

  // Safety check
  if (!businessUnitId) {
    return (
      <div className="p-8">
        <p>Error: Could not determine the Business Unit from the request.</p>
      </div>
    );
  }

  const orders = await prismadb.order.findMany({
    where: {
      businessUnitId: businessUnitId
    },
    include: {
      user: true,
      table: true,
      items: {
        include: {
          menuItem: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  const formattedOrders: OrderColumn[] = orders.map((item) => ({
    id: item.id,
    items: item.items.map((orderItem) => orderItem.menuItem.name).join(", "),
    server: item.user.name,
    table: item.table?.name || "N/A",
    totalPrice: formatter.format(item.totalAmount),
    status: item.status,
    isPaid: item.isPaid,
    createdAt: format(item.createdAt, "MMMM do, yyyy"),
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <OrdersClient data={formattedOrders} />
      </div>
    </div>
  );
}
