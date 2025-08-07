import React from 'react';
import { auth } from '@/auth';
import {
  getPurchaseOrderById,
  getPurchaseOrderIdsForNav,
  getVendors,
  getUsers,
  getInventoryItems,
  getExpenseAccounts,
  getAvailablePurchaseRequests,
  getPurchaseRequestById, // New import
} from '@/lib/actions/pr-po-actions';
import type { PurchaseRequestWithDetails } from '@/types/pr-po-types';
import { PurchaseOrderForm } from '../components/po-form';
import { PurchaseRequestSelector } from '../components/pr-selector';

interface PurchaseOrderPageProps {
  params: Promise<{
    purchaseOrderId: string;
    businessUnitId: string;
  }>;
}

export default async function PurchaseOrderPage({ params }: PurchaseOrderPageProps) {
  // Await params before destructuring [^2]
  const { purchaseOrderId, businessUnitId } = await params;

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

  // Handle "new" cases: 'new' or 'new-from-pr-{prId}'
  if (!purchaseOrderId || purchaseOrderId === 'undefined') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Invalid Purchase Order ID</h1>
          <p className="text-muted-foreground">The URL is missing a valid Purchase Order identifier. Please select an approved Purchase Request to create a new Purchase Order, or navigate to an existing one.</p>
        </div>
      </div>
    );
  }

  if (purchaseOrderId.startsWith('new')) {
    let selectedPR: PurchaseRequestWithDetails | null = null;
    let availablePRs: PurchaseRequestWithDetails[] = [];

    // Determine if we are creating from a specific PR
    const isCreatingFromPR = purchaseOrderId.startsWith('new-from-pr-');
    const prIdFromPath = isCreatingFromPR ? purchaseOrderId.replace('new-from-pr-', '') : undefined;

    // Fetch common data for new PO creation
    const [vendors, users, inventoryItems, expenseAccounts] = await Promise.all([
      getVendors(businessUnitId),
      getUsers(businessUnitId),
      getInventoryItems(businessUnitId),
      getExpenseAccounts(businessUnitId),
    ]);

    if (isCreatingFromPR && prIdFromPath) {
      selectedPR = await getPurchaseRequestById(prIdFromPath);
      if (!selectedPR) {
        return (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-destructive mb-2">Purchase Request Not Found</h1>
              <p className="text-muted-foreground">
                The purchase request with ID "{prIdFromPath}" could not be found or is not available.
              </p>
            </div>
          </div>
        );
      }
    } else {
      // If not creating from a specific PR, fetch all available PRs for selection
      availablePRs = await getAvailablePurchaseRequests(businessUnitId);
    }

    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Create New Purchase Order</h1>
          <p className="text-muted-foreground">
            {selectedPR ? 'Review and convert this purchase request to a purchase order' : 'Select an approved purchase request to convert to a purchase order, or create a blank PO.'}
          </p>
        </div>
        {selectedPR ? (
          <PurchaseOrderForm
            initialOrder={null}
            orderIds={[]}
            businessUnitId={businessUnitId}
            currentUserId={currentUserId}
            userRole={userRole || ''}
            vendors={vendors}
            users={users}
            inventoryItems={inventoryItems}
            expenseAccounts={expenseAccounts}
            selectedPurchaseRequest={selectedPR}
          />
        ) : (
          <PurchaseRequestSelector
            availablePRs={availablePRs}
            businessUnitId={businessUnitId}
            currentUserId={currentUserId}
            userRole={userRole || ''}
            vendors={vendors}
            users={users}
            inventoryItems={inventoryItems}
            expenseAccounts={expenseAccounts}
          />
        )}
      </div>
    );
  }

  const [
    order,
    orderIds,
    vendors,
    users,
    inventoryItems,
    expenseAccounts
  ] = await Promise.all([
    getPurchaseOrderById(purchaseOrderId),
    getPurchaseOrderIdsForNav(businessUnitId),
    getVendors(businessUnitId),
    getUsers(businessUnitId),
    getInventoryItems(businessUnitId),
    getExpenseAccounts(businessUnitId)
  ]);

  // Handle case where order is not found
  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Purchase Order Not Found</h1>
          <p className="text-muted-foreground">
            The purchase order with ID "{purchaseOrderId}" could not be found.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Purchase Order {order.poNumber}
        </h1>
        <p className="text-muted-foreground">
          View and manage purchase order details
        </p>
      </div>
      <PurchaseOrderForm
        initialOrder={order}
        orderIds={orderIds}
        businessUnitId={businessUnitId}
        currentUserId={currentUserId}
        userRole={userRole || ''}
        vendors={vendors}
        users={users}
        inventoryItems={inventoryItems}
        expenseAccounts={expenseAccounts}
      />
    </div>
  );
}
