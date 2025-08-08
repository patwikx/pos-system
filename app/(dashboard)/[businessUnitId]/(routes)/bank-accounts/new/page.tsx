import { headers } from 'next/headers';
import { getAccountsForDropdown } from '@/lib/actions/financials-actions';
import { BankAccountForm } from '../components/bank-accounts-form';


export default async function NewBankAccountPage() {
  const headersList = await headers();
  const businessUnitId = headersList.get('x-business-unit-id');

  if (!businessUnitId) {
    return <div className="p-8">Error: Business Unit could not be identified.</div>;
  }

  const assetAccounts = await getAccountsForDropdown(businessUnitId, 'ASSET');

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <BankAccountForm assetAccounts={assetAccounts} />
      </div>
    </div>
  );
}