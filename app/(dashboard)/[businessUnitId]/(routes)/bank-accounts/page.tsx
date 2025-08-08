import { headers } from "next/headers";
import { format } from "date-fns";
import { getBankAccounts } from "@/lib/actions/financials-actions";
import { BankAccountColumn } from "@/types/financials-types";
import { formatter } from "@/lib/utils";
import { BankAccountsClient } from "./bank-accounts-clients";

export default async function BankAccountsPage() {
  const headersList = await headers();
  const businessUnitId = headersList.get("x-business-unit-id");

  if (!businessUnitId) {
    return <div className="p-8">Error: Business Unit could not be identified.</div>;
  }

  const bankAccounts = await getBankAccounts(businessUnitId);
  
  const formattedBankAccounts: BankAccountColumn[] = bankAccounts.map((account) => ({
    id: account.id,
    name: account.name,
    bankName: account.bankName,
    accountNumber: account.accountNumber,
    glAccountCode: account.glAccount.accountCode,
    balance: formatter.format(account.glAccount.balance),
    transactionCount: account._count.incomingPayments + account._count.outgoingPayments + account._count.deposits,
    createdAt: format(account.createdAt, 'MMMM do, yyyy'),
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <BankAccountsClient data={formattedBankAccounts} />
      </div>
    </div>
  );
}