import { headers } from 'next/headers';
import { getBusinessPartners, getAccountsForDropdown } from '@/lib/actions/financials-actions';
import { BusinessPartnerType } from '@prisma/client';
import { ARInvoiceForm } from './components/ar-invoice-form';
import prismadb from '@/lib/db';

export default async function NewARInvoicePage() {
  const headersList = await headers();
  const businessUnitId = headersList.get('x-business-unit-id');

  if (!businessUnitId) {
    return <div className="p-8">Error: Business Unit could not be identified.</div>;
  }

  const [customers, revenueAccounts, menuItems] = await Promise.all([
    getBusinessPartners(businessUnitId, BusinessPartnerType.CUSTOMER),
    getAccountsForDropdown(businessUnitId, 'REVENUE'),
    // Get menu items for invoice line items
    prismadb.menuItem.findMany({
      where: { businessUnitId },
      select: { id: true, name: true, price: true }
    })
  ]);

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <ARInvoiceForm 
          customers={customers}
          revenueAccounts={revenueAccounts}
          menuItems={menuItems}
        />
      </div>
    </div>
  );
}