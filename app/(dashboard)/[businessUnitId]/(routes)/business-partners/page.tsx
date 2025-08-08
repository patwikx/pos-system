import { format } from "date-fns";
import { headers } from "next/headers";
import prismadb from "@/lib/db";

import { BusinessPartnerColumn } from "./components/business-partner-columns";
import { BusinessPartnersClient } from "./components/business-partner-client";

export default async function BusinessPartnersPage() {
  const headersList = await headers();
  const businessUnitId = headersList.get("x-business-unit-id");

  if (!businessUnitId) {
    return <div className="p-8">Error: Business Unit could not be identified.</div>;
  }

  const businessPartners = await prismadb.businessPartner.findMany({
    where: { businessUnitId },
    orderBy: { name: 'asc' }
  });

  const formattedPartners: BusinessPartnerColumn[] = businessPartners.map((partner) => ({
    id: partner.id,
    bpCode: partner.bpCode,
    name: partner.name,
    type: partner.type,
    phone: partner.phone,
    email: partner.email,
    loyaltyPoints: partner.loyaltyPoints,
    createdAt: format(partner.createdAt, 'MMMM do, yyyy'),
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <BusinessPartnersClient data={formattedPartners} />
      </div>
    </div>
  );
}