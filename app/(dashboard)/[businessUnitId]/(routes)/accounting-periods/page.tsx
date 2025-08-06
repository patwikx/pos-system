import { format } from "date-fns";
import { headers } from "next/headers";
import prismadb from "@/lib/db";

import { AccountingPeriodColumn } from "./components/columns";
import { AccountingPeriodsClient } from "./components/client";

export default async function AccountingPeriodsPage() {
  // This is the correct pattern, using headers.
  const headersList = await headers();
  const businessUnitId = headersList.get("x-business-unit-id");

  if (!businessUnitId) {
    return <div className="p-8">Error: Business Unit could not be identified.</div>;
  }

  const accountingPeriods = await prismadb.accountingPeriod.findMany({
    where: {
      businessUnitId: businessUnitId
    },
    orderBy: {
      startDate: 'desc'
    }
  });

  const formattedPeriods: AccountingPeriodColumn[] = accountingPeriods.map((item) => ({
    id: item.id,
    name: item.name,
    startDate: format(item.startDate, 'MMMM do, yyyy'),
    endDate: format(item.endDate, 'MMMM do, yyyy'),
    status: item.status,
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <AccountingPeriodsClient data={formattedPeriods} />
      </div>
    </div>
  );
};