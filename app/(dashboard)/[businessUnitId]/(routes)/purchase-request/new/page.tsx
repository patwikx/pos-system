// app/dashboard/purchase-requests/new/page.tsx

import { headers } from "next/headers";
import { getUoMs } from "@/lib/actions/pr-po-actions"; // 1. Only import getUoMs
import prismadb from "@/lib/db";
import { auth } from "@/auth";
import { CreatePurchaseRequestForm } from "../components/create-pr-form";

export default async function CreatePurchaseRequestPage() {
  // Read all necessary server-side info
  const headersList = await headers();
  const businessUnitId = headersList.get("x-business-unit-id");
  const session = await auth();
  const userId = session?.user?.id;

  // Safety checks
  if (!businessUnitId || !userId) {
    return <p className="p-8">Error: Missing Business Unit or User information.</p>;
  }

  // Fetch only the data the form component needs
  const businessUnit = await prismadb.businessUnit.findUnique({
    where: { id: businessUnitId },
    select: { name: true },
  });

  // 2. Fetch only the UoMs
  const initialUoMs = await getUoMs();

  if (!businessUnit) {
    return <p className="p-8">Error: Invalid Business Unit ID.</p>;
  }

  // 3. Pass only the required props down to the client form
  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <CreatePurchaseRequestForm
          currentUserId={userId}
          businessUnitId={businessUnitId}
          businessUnitName={businessUnit.name}
          initialUoMs={initialUoMs}
        />
      </div>
    </div>
  );
}
