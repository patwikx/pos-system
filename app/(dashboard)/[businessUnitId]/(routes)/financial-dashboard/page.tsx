import { headers } from 'next/headers';
import { getFinancialDashboard } from '@/lib/actions/financials-actions';
import { FinancialDashboardClient } from './components/financial-dashboard';


export default async function FinancialDashboardPage() {
  const headersList = await headers();
  const businessUnitId = headersList.get('x-business-unit-id');

  if (!businessUnitId) {
    return <div className="p-8">Error: Business Unit could not be identified.</div>;
  }

  const dashboardData = await getFinancialDashboard(businessUnitId);

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <FinancialDashboardClient data={dashboardData} businessUnitId={businessUnitId} />
      </div>
    </div>
  );
}