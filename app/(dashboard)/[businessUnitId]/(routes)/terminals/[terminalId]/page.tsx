import prismadb from "@/lib/db";
import { TerminalForm } from "./components/terminal-form";

export default async function TerminalPage({
  params
}: {
  params: Promise<{ terminalId: string }>;
}) {
  // ✅ Await params for Next.js 14+
  const { terminalId } = await params;

  const terminal = await prismadb.posTerminal.findUnique({
    where: {
      id: terminalId,
    }
  });

  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <TerminalForm initialData={terminal} />
      </div>
    </div>
  );
}
