import React from 'react';
import { getAvailablePurchaseRequests } from '@/lib/actions/pr-po-actions';
import { auth } from '@/auth'; // Assuming auth is available here
import { PurchaseRequestSidebar } from './components/pr-sidebar';

interface PurchaseOrderLayoutProps {
  children: React.ReactNode;
  params: {
    businessUnitId: string;
  };
}

export default async function PurchaseOrderLayout({ children, params }: PurchaseOrderLayoutProps) {
  // THIS IS THE CRUCIAL LINE: Await params before destructuring
  const { businessUnitId } = await params;
  const session = await auth();
  const currentUserId = session?.user?.id;

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

  const availablePRs = await getAvailablePurchaseRequests(businessUnitId);

  return (
    <div className="flex h-full">
      {/* Sidebar for Purchase Requests */}
      <aside className="w-109 border-r bg-background p-4 overflow-y-auto">
        <PurchaseRequestSidebar
          availablePRs={availablePRs}
          businessUnitId={businessUnitId}
        />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
