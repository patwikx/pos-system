import prismadb from "@/lib/db";
import { UoMForm } from "./components/uom-form";

export default async function UoMPage({
  params
}: {
  params: Promise<{ uomId: string }>;
}) {
  // ✅ Await params for Next.js 14+
  const { uomId } = await params;

  const uom = await prismadb.uoM.findUnique({
    where: {
      id: uomId
    }
  });

  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <UoMForm initialData={uom} />
      </div>
    </div>
  );
}
