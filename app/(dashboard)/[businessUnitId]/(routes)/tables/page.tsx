import { format } from "date-fns";
import prismadb from "@/lib/db";

import { TableColumn } from "./components/columns";
import { TablesClient } from "./components/client";

export default async function TablesPage({
  params
}: {
  params: Promise<{ businessUnitId: string }>;
}) {
  // ✅ Await params for Next.js 14+
  const { businessUnitId } = await params;

  const tables = await prismadb.table.findMany({
    where: {
      businessUnitId
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const formattedTables: TableColumn[] = tables.map((item) => ({
    id: item.id,
    name: item.name,
    status: item.status,
    createdAt: format(item.createdAt, 'MMMM do, yyyy'),
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <TablesClient data={formattedTables} />
      </div>
    </div>
  );
}
