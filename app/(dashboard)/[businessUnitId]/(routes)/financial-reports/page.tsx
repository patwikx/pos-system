import { headers } from "next/headers";
import { FinancialReportsClient } from "./components/client";

export default async function FinancialReportsPage() {
  const headersList = await headers();
  const businessUnitId = headersList.get("x-business-unit-id");

  if (!businessUnitId) {
    return <div className="p-8">Error: Business Unit could not be identified...</div>;
  }

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <FinancialReportsClient businessUnitId={businessUnitId} />
      </div>
    </div>
  );
}