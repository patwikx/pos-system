import { format } from "date-fns";
import { headers } from "next/headers";
import prismadb from "@/lib/db";
import { formatter } from "@/lib/utils";

import { GlAccountColumn } from "./components/columns";
import { ChartOfAccountsClient } from "./components/client";

export default async function ChartOfAccountsPage() {
  const headersList = await headers();
  const businessUnitId = headersList.get("x-business-unit-id");

  if (!businessUnitId) {
    return <div className="p-8">Error: Business Unit could not be identified.</div>;
  }

  const [accounts, accountTypes] = await Promise.all([
    prismadb.glAccount.findMany({
      where: { businessUnitId },
      include: {
        accountType: true,
        _count: {
          select: { journalLines: true }
        }
      },
      orderBy: { accountCode: 'asc' }
    }),
    prismadb.accountType.findMany({
      orderBy: { name: 'asc' }
    })
  ]);

  const formattedAccounts: GlAccountColumn[] = accounts.map((account) => ({
    id: account.id,
    accountCode: account.accountCode,
    name: account.name,
    accountType: account.accountType.name,
    balance: formatter.format(account.balance),
    transactionCount: account._count.journalLines,
    createdAt: format(account.createdAt, 'MMMM do, yyyy'),
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <ChartOfAccountsClient data={formattedAccounts} accountTypes={accountTypes} />
      </div>
    </div>
  );
}