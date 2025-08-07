import { headers } from 'next/headers';
import { auth } from '@/auth';
import prismadb from '@/lib/db';
import { 
    getMenuItems, 
    getMenuCategories,
    getTablesWithActiveOrders,
    getDiscounts,
    getBusinessPartners,
    getUsersForBusinessUnit,
    getActiveShift,
} from '@/lib/actions/queries';
import { PosClient } from './components/pos-client';


export default async function PosPage() {
  const headersList = await headers();
  const businessUnitId = headersList.get("x-business-unit-id");
  const session = await auth();
  const userId = session?.user?.id;

  if (!businessUnitId || !userId) {
    return <div className="p-8">Error: Could not identify the session or business unit.</div>;
  }
  
  // A POS screen needs an active terminal. We'll find the first one for this example.
  const activeTerminal = await prismadb.posTerminal.findFirst({
    where: { businessUnitId, isActive: true }
  });

  if (!activeTerminal) {
    return <div className="p-8">Error: No active POS terminal found for this business unit.</div>;
  }

  // Fetch all necessary data in parallel
  const [
    menuItems, 
    categories, 
    tables, 
    discounts, 
    businessPartners,
    users,
    activeShift,
  ] = await Promise.all([
    getMenuItems(businessUnitId),
    getMenuCategories(businessUnitId),
    getTablesWithActiveOrders(businessUnitId),
    getDiscounts(businessUnitId),
    getBusinessPartners(),
    getUsersForBusinessUnit(businessUnitId),
    getActiveShift(userId, activeTerminal.id),
  ]);

  return (
    <PosClient 
      initialTables={tables}
      menuItems={menuItems}
      categories={categories}
      discounts={discounts}
      businessPartners={businessPartners}
      users={users}
      activeShift={activeShift}
      activeTerminal={activeTerminal}
    />
  );
};