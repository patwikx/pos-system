import React from 'react';
import { PurchaseRequestList } from './components/pr-list';
import { auth } from '@/auth';
import { headers } from 'next/headers'; // 1. Import headers

export default async function PurchaseRequestsPage() {
  const currentUser = await auth();
  const headersList = await headers(); // 2. Get the headers list
  const businessUnitId = headersList.get('x-business-unit-id'); // 3. Read the ID

  // Safety check in case the header is missing
  if (!businessUnitId) {
    return (
        <div className="container mx-auto py-8">
            <p className="text-red-500">Error: Business Unit could not be identified.</p>
        </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <PurchaseRequestList
        currentUserId={currentUser?.user.id || ''}
        // userRole={currentUser?.user.role.role || ''}
        businessUnitId={businessUnitId} // 4. Pass the ID as a prop
      />
    </div>
  );
}
