import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prismadb from '@/lib/db';

export async function POST(
  req: Request,
  { params }: { params: { businessUnitId: string } }
) {
  try {
    const session = await auth();
    // TODO: Add authorization check (e.g., only Admins or Accountants)
    if (!session?.user?.id) return new NextResponse("Unauthenticated", { status: 401 });

    const body = await req.json();
    const { name, startDate, endDate, status } = body;

    if (!name) return new NextResponse("Name is required", { status: 400 });
    if (!startDate) return new NextResponse("Start date is required", { status: 400 });
    if (!endDate) return new NextResponse("End date is required", { status: 400 });
    if (!status) return new NextResponse("Status is required", { status: 400 });

    const accountingPeriod = await prismadb.accountingPeriod.create({
      data: {
        name,
        startDate,
        endDate,
        status,
        businessUnitId: params.businessUnitId
      }
    });
  
    return NextResponse.json(accountingPeriod);
  } catch (error) {
    console.log('[ACCOUNTING_PERIODS_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};