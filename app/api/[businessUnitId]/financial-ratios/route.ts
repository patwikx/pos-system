import { NextResponse } from 'next/server';
import { calculateFinancialRatios } from '@/lib/actions/financials-actions';

export async function GET(
  req: Request,
  context: { params: Promise<{ businessUnitId: string }> }
) {
  try {
    const { businessUnitId } = await context.params;
    
    const ratios = await calculateFinancialRatios(businessUnitId);
    return NextResponse.json(ratios);
  } catch (error) {
    console.log('[FINANCIAL_RATIOS_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}