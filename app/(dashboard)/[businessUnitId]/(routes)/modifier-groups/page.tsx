import { format } from "date-fns";
import { headers } from "next/headers";
import prismadb from "@/lib/db";
import { ModifierGroupColumn } from "./components/columns";
import { ModifierGroupsClient } from "./components/client";


export default async function ModifierGroupsPage() {
  const headersList = await headers();
  const businessUnitId = headersList.get("x-business-unit-id");

  if (!businessUnitId) {
    return <div className="p-8">Error: Business Unit could not be identified.</div>;
  }

  const modifierGroups = await prismadb.modifierGroup.findMany({
    where: { businessUnitId },
    orderBy: { createdAt: 'desc' }
  });

  const formattedGroups: ModifierGroupColumn[] = modifierGroups.map((item) => ({
    id: item.id,
    name: item.name,
    createdAt: format(item.createdAt, 'MMMM do, yyyy'),
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <ModifierGroupsClient data={formattedGroups} />
      </div>
    </div>
  );
};