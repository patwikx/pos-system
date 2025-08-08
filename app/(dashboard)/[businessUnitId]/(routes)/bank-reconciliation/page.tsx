import { headers } from 'next/headers';
import { getBankAccounts } from '@/lib/actions/financials-actions';
import { BankReconciliationClient } from './components/bank-reconciliation-client';

export default async function BankReconciliationPage() {
  const headersList = await headers();
  const businessUnitId = headersList.get('x-business-unit-id');

  if (!businessUnitId) {
    return <div className="p-8">Error: Business Unit could not be identified.</div>;
  }

  const bankAccounts = await getBankAccounts(businessUnitId);

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <BankReconciliationClient bankAccounts={bankAccounts} />
      </div>
    </div>
  );
}