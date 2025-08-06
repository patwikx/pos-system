import { format } from "date-fns";
import prismadb from "@/lib/db";

import { PosTerminalColumn } from "./components/columns";
import { TerminalsClient } from "./components/client";

export default async function TerminalsPage({
  params
}: {
  params: Promise<{ businessUnitId: string }>;
}) {
  // ✅ Await params for Next.js 14+
  const { businessUnitId } = await params;

  const terminals = await prismadb.posTerminal.findMany({
    where: {
      businessUnitId
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const formattedTerminals: PosTerminalColumn[] = terminals.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    isActive: item.isActive,
    createdAt: format(item.createdAt, 'MMMM do, yyyy'),
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <TerminalsClient data={formattedTerminals} />
      </div>
    </div>
  );
}
