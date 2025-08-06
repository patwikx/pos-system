import prismadb from "@/lib/db";
import { TableForm } from "./components/table-form";

export default async function TablePage({
  params
}: {
  params: Promise<{ tableId: string }>;
}) {
  // ✅ Await params for Next.js 14+
  const { tableId } = await params;

  const table = await prismadb.table.findUnique({
    where: {
      id: tableId,
    }
  });

  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <TableForm initialData={table} />
      </div>
    </div>
  );
}
