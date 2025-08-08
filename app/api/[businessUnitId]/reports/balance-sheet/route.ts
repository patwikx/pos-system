import { NextResponse } from 'next/server';
import { generateBalanceSheet } from '@/lib/actions/financials-actions';

export async function GET(
  req: Request,
  context: { params: Promise<{ businessUnitId: string }> }
) {
  try {
    const { businessUnitId } = await context.params;
    const { searchParams } = new URL(req.url);
    
    const asOfDate = searchParams.get('asOfDate') ? new Date(searchParams.get('asOfDate')!) : undefined;
    
    const balanceSheet = await generateBalanceSheet(businessUnitId, asOfDate);
    return NextResponse.json(balanceSheet);
  } catch (error) {
    console.log('[BALANCE_SHEET_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}