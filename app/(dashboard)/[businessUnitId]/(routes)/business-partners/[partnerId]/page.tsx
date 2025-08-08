import { headers } from 'next/headers';
import prismadb from "@/lib/db";
import { BusinessPartnerForm } from "../components/business-partner-form";

export default async function BusinessPartnerPage() {
  const headersList = await headers();
  const pathname = headersList.get('next-url') || '';
  const businessUnitId = headersList.get('x-business-unit-id');
  
  const partnerId = pathname.split('/').pop();

  if (!businessUnitId || !partnerId) {
    return <div className="p-8">Error: Could not determine the business partner or business unit.</div>;
  }

  const businessPartner = partnerId === 'new' ? null : await prismadb.businessPartner.findUnique({
    where: { id: partnerId }
  });

  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <BusinessPartnerForm initialData={businessPartner} />
      </div>
    </div>
  );
}