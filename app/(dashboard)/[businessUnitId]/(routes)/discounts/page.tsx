import { headers } from "next/headers";
import { format } from "date-fns";
import prismadb from "@/lib/db";

import { DiscountColumn } from "./components/columns";
import { DiscountsClient } from "./components/client";
import { formatter } from "@/lib/utils";
import { DiscountType } from "@prisma/client";

export default async function DiscountsPage({
  params
}: {
  params: Promise<{ businessUnitId: string }>;
}) {
  // Await params (Next.js 14+ requirement)
  const { businessUnitId: businessUnitIdFromParams } = await params;

  // Try getting businessUnitId from headers first
  const headersList = await headers();
  const businessUnitId = headersList.get("x-business-unit-id") || businessUnitIdFromParams;

  // Safety check
  if (!businessUnitId) {
    return (
      <div className="p-8">
        <p>Error: Could not determine the Business Unit from the request.</p>
      </div>
    );
  }

  const discounts = await prismadb.discount.findMany({
    where: {
      businessUnitId
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  const formattedDiscounts: DiscountColumn[] = discounts.map((item) => ({
    id: item.id,
    name: item.name,
    value:
      item.type === DiscountType.PERCENTAGE
        ? `${item.value}%`
        : formatter.format(item.value),
    type: item.type,
    isActive: item.isActive,
    createdAt: format(item.createdAt, "MMMM do, yyyy"),
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <DiscountsClient data={formattedDiscounts} />
      </div>
    </div>
  );
}
