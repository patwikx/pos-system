import { headers } from 'next/headers';
import { getDashboardData } from "@/lib/actions/get-dashboard-data";
import { DashboardClient } from './components/dashboad-client';
;

// Remove the props interface and the params from the function signature
export default async function DashboardPage() {
  // Read the businessUnitId from the header
  const headersList = await headers();
  const businessUnitId = headersList.get('x-business-unit-id');

  // Add a safety check in case the header is somehow missing
  if (!businessUnitId) {
    return (
        <div className="p-8">
            <p>Error: Could not determine the Business Unit from the URL.</p>
        </div>
    );
  }

  const dashboardData = await getDashboardData(businessUnitId);

  return (
    <div className="flex-col">
      <div className="flex-1">
        <DashboardClient data={dashboardData} />
      </div>
    </div>
  );
};