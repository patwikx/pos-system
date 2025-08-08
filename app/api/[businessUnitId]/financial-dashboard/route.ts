import { NextResponse } from 'next/server';
import { getFinancialDashboard } from '@/lib/actions/financials-actions';

export async function GET(
  req: Request,
  context: { params: Promise<{ businessUnitId: string }> }
) {
  try {
    const { businessUnitId } = await context.params;
    
    const dashboardData = await getFinancialDashboard(businessUnitId);
    return NextResponse.json(dashboardData);
  } catch (error) {
    console.log('[FINANCIAL_DASHBOARD_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}