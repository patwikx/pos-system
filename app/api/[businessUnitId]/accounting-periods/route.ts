import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prismadb from '@/lib/db';
import { PeriodStatus } from '@prisma/client';

export async function POST(
  req: Request,
  context: { params: Promise<{ businessUnitId: string }> }
) {
  try {
    const { businessUnitId } = await context.params;
    const session = await auth();
    if (!session?.user?.id) return new NextResponse("Unauthenticated", { status: 401 });

    const body = await req.json();
    const { name, startDate, endDate, status } = body;

    if (!name) return new NextResponse("Name is required", { status: 400 });
    if (!startDate) return new NextResponse("Start date is required", { status: 400 });
    if (!endDate) return new NextResponse("End date is required", { status: 400 });
    if (!status) return new NextResponse("Status is required", { status: 400 });

    // Validate period dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      return new NextResponse("Start date must be before end date", { status: 400 });
    }

    // Check for overlapping periods
    const overlappingPeriod = await prismadb.accountingPeriod.findFirst({
      where: {
        businessUnitId,
        OR: [
          {
            AND: [
              { startDate: { lte: start } },
              { endDate: { gte: start } }
            ]
          },
          {
            AND: [
              { startDate: { lte: end } },
              { endDate: { gte: end } }
            ]
          }
        ]
      }
    });

    if (overlappingPeriod) {
      return new NextResponse("Period overlaps with existing accounting period", { status: 409 });
    }
    const accountingPeriod = await prismadb.accountingPeriod.create({
      data: {
        name,
        startDate: start,
        endDate: end,
        status,
        businessUnitId
      }
    });
  
    return NextResponse.json(accountingPeriod);
  } catch (error) {
    console.log('[ACCOUNTING_PERIODS_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};