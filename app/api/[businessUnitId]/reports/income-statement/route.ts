import { NextResponse } from 'next/server';
import { generateIncomeStatement } from '@/lib/actions/financials-actions';

export async function GET(
  req: Request,
  context: { params: Promise<{ businessUnitId: string }> }
) {
  try {
    const { businessUnitId } = await context.params;
    const { searchParams } = new URL(req.url);
    
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : new Date(new Date().getFullYear(), 0, 1);
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : new Date();
    
    const incomeStatement = await generateIncomeStatement(businessUnitId, startDate, endDate);
    return NextResponse.json(incomeStatement);
  } catch (error) {
    console.log('[INCOME_STATEMENT_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}