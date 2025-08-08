import { headers } from 'next/headers';
import { getBusinessPartners, getAccountsForDropdown } from '@/lib/actions/financials-actions';
import { BusinessPartnerType } from '@prisma/client';
import { APInvoiceForm } from '../components/ap-invoice-form';


export default async function NewAPInvoicePage() {
  const headersList = await headers();
  const businessUnitId = headersList.get('x-business-unit-id');

  if (!businessUnitId) {
    return <div className="p-8">Error: Business Unit could not be identified.</div>;
  }

  // Awaited the promises to resolve before passing them to the component
  const [vendors, expenseAccounts] = await Promise.all([
    getBusinessPartners(businessUnitId, BusinessPartnerType.VENDOR),
    getAccountsForDropdown(businessUnitId, 'EXPENSE')
  ]);

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <APInvoiceForm 
          vendors={vendors}
          expenseAccounts={expenseAccounts}
        />
      </div>
    </div>
  );
}
