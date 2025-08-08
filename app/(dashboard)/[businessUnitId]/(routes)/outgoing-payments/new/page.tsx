import { headers } from 'next/headers';
import { getBusinessPartners, getBankAccounts } from '@/lib/actions/financials-actions';
import { BusinessPartnerType } from '@prisma/client';
import { OutgoingPaymentForm } from '../components/outgoing-payments-form';

export default async function NewOutgoingPaymentPage() {
  const headersList = await headers();
  const businessUnitId = headersList.get('x-business-unit-id');

  if (!businessUnitId) {
    return <div className="p-8">Error: Business Unit could not be identified.</div>;
  }

  const [vendors, bankAccounts] = await Promise.all([
    getBusinessPartners(businessUnitId, BusinessPartnerType.VENDOR),
    getBankAccounts(businessUnitId)
  ]);

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <OutgoingPaymentForm 
          vendors={vendors}
          bankAccounts={bankAccounts}
        />
      </div>
    </div>
  );
}