import React from 'react';
import { auth } from '@/auth';
import {
  getBusinessUnits,
  getPurchaseOrderIdsForNav, // To get all PO IDs for navigation
  getPurchaseOrderById,     // To get the initial PO data
  getVendors,
  getUsers,
  getInventoryItems,
  getExpenseAccounts,
} from '@/lib/actions/pr-po-actions';
import { PurchaseOrderForm } from './components/po-form'; // Import the form directly
import { redirect } from 'next/navigation';

// This page will now display the Purchase Order Form, either for the first PO or a blank one
export default async function PurchaseOrdersRootPage({ params }: { params: { businessUnitId: string } }) {
  const { businessUnitId } = await params;

  const session = await auth();
  const currentUserId = session?.user?.id;
  const userRole = session?.user?.role?.role;

  if (!businessUnitId || !currentUserId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Access Error</h1>
          <p className="text-muted-foreground">Missing Business Unit or User information.</p>
        </div>
      </div>
    );
  }

  // Fetch all necessary data for the form
  const [
    orderIds,
    vendors,
    users,
    inventoryItems,
    expenseAccounts,
  ] = await Promise.all([
    getPurchaseOrderIdsForNav(businessUnitId), // Get all PO IDs for navigation
    getVendors(businessUnitId),
    getUsers(businessUnitId),
    getInventoryItems(businessUnitId),
    getExpenseAccounts(businessUnitId),
  ]);

  let initialOrder = null;
  if (orderIds.length > 0) {
    // If there are existing POs, fetch the first one to display
    initialOrder = await getPurchaseOrderById(orderIds[0]);
  }

  // If no initial order is found (e.g., no POs exist), but we are not explicitly creating a new one,
  // we might want to redirect to the 'new' route or show a blank form.
  // For this request, we'll show a blank form if no POs exist.

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          {initialOrder ? `Purchase Order ${initialOrder.poNumber}` : 'Create New Purchase Order'}
        </h1>
        <p className="text-muted-foreground">
          {initialOrder ? 'View and manage purchase order details' : 'Start by creating a new purchase order'}
        </p>
      </div>
      <PurchaseOrderForm
        initialOrder={initialOrder}
        orderIds={orderIds} // Pass all order IDs for navigation
        businessUnitId={businessUnitId}
        currentUserId={currentUserId}
        userRole={userRole || ''}
        vendors={vendors}
        users={users}
        inventoryItems={inventoryItems}
        expenseAccounts={expenseAccounts}
        // selectedPurchaseRequest is not passed here, as this page is for existing/blank POs
      />
    </div>
  );
}
