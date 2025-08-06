import { format } from "date-fns";
import { UoMClient } from "./components/client";
import prismadb from "@/lib/db";
import { UoMColumn } from "./components/columns";

export default async function UoMsPage({
  params
}: {
  params: Promise<{ businessUnitId: string }>;
}) {
  // ✅ Await params for Next.js 14+


  const uoms = await prismadb.uoM.findMany({
    orderBy: {
      createdAt: 'desc'
    }
  });

  const formattedColors: UoMColumn[] = uoms.map((item) => ({
    id: item.id,
    UoM: item.symbol,
    createdAt: format(item.createdAt, 'MMMM do, yyyy'),
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <UoMClient data={formattedColors} />
      </div>
    </div>
  );
}
