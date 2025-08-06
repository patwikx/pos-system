import { format } from "date-fns";
import { headers } from "next/headers";
import prismadb from "@/lib/db";
import { ModifierColumn } from "./components/columns";
import { formatter } from "@/lib/utils";
import { ModifiersClient } from "./components/client";

export default async function ModifiersPage() {
  const headersList = await headers();
  const businessUnitId = headersList.get("x-business-unit-id");

  if (!businessUnitId) {
    return <div className="p-8">Error: Business Unit could not be identified.</div>;
  }

  const modifiers = await prismadb.modifier.findMany({
    where: { 
        modifierGroup: {
            businessUnitId: businessUnitId
        }
    },
    include: {
        modifierGroup: true // Include the group to display its name
    },
    orderBy: { createdAt: 'desc' }
  });

  const formattedModifiers: ModifierColumn[] = modifiers.map((item) => ({
    id: item.id,
    name: item.name,
    priceChange: formatter.format(item.priceChange),
    group: item.modifierGroup.name,
    createdAt: format(item.createdAt, 'MMMM do, yyyy'),
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <ModifiersClient data={formattedModifiers} />
      </div>
    </div>
  );
};