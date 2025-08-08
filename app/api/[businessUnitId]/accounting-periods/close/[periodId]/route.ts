import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { validateAccountingPeriod, closeAccountingPeriod } from '@/lib/actions/financials-actions';

export async function POST(
  req: Request,
  context: { params: Promise<{ businessUnitId: string; periodId: string }> }
) {
  try {
    const { businessUnitId, periodId } = await context.params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    const result = await closeAccountingPeriod(periodId);
    
    if (result.success) {
      return NextResponse.json({ message: result.message });
    } else {
      return new NextResponse(result.error, { status: 400 });
    }
  } catch (error) {
    console.log('[PERIOD_CLOSE_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(
  req: Request,
  context: { params: Promise<{ businessUnitId: string; periodId: string }> }
) {
  try {
    const { businessUnitId, periodId } = await context.params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    const validation = await validateAccountingPeriod(periodId);
    return NextResponse.json(validation);
  } catch (error) {
    console.log('[PERIOD_VALIDATION_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}