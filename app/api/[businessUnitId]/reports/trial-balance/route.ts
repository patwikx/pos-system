import { NextResponse } from 'next/server';
import { generateTrialBalance } from '@/lib/actions/financials-actions';

export async function GET(
  req: Request,
  context: { params: Promise<{ businessUnitId: string }> }
) {
  try {
    const { businessUnitId } = await context.params;
    const { searchParams } = new URL(req.url);
    
    const asOfDate = searchParams.get('asOfDate') ? new Date(searchParams.get('asOfDate')!) : undefined;
    
    const trialBalance = await generateTrialBalance(businessUnitId, asOfDate);
    return NextResponse.json(trialBalance);
  } catch (error) {
    console.log('[TRIAL_BALANCE_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}