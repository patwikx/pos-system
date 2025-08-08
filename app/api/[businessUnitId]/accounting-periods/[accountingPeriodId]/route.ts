import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prismadb from '@/lib/db';
import { PeriodStatus } from '@prisma/client';

export async function PATCH(
  req: Request,
  context: { params: Promise<{ businessUnitId: string; accountingPeriodId: string }> }
) {
  try {
    const { businessUnitId, accountingPeriodId } = await context.params;
    const session = await auth();
    if (!session?.user?.id) return new NextResponse("Unauthenticated", { status: 401 });

    const body = await req.json();
    const { name, startDate, endDate, status } = body;

    // Validate period dates
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start >= end) {
        return new NextResponse("Start date must be before end date", { status: 400 });
      }
    }

    const accountingPeriod = await prismadb.accountingPeriod.update({
      where: {
        id: accountingPeriodId,
        businessUnitId,
      },
      data: { 
        name, 
        startDate: startDate ? new Date(startDate) : undefined, 
        endDate: endDate ? new Date(endDate) : undefined, 
        status 
      }
    });
  
    return NextResponse.json(accountingPeriod);
  } catch (error) {
    console.log('[ACCOUNTING_PERIOD_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};

export async function DELETE(
    req: Request,
    context: { params: Promise<{ businessUnitId: string; accountingPeriodId: string }> }
) {
    try {
        const { businessUnitId, accountingPeriodId } = await context.params;
        const session = await auth();
        if (!session?.user?.id) return new NextResponse("Unauthenticated", { status: 401 });

        // Prevent deleting a period if it contains journal entries
        const journalEntryExists = await prismadb.journalEntry.findFirst({
            where: { 
              businessUnitId,
              postingDate: {
                gte: (await prismadb.accountingPeriod.findUnique({
                  where: { id: accountingPeriodId },
                  select: { startDate: true, endDate: true }
                }))?.startDate,
                lte: (await prismadb.accountingPeriod.findUnique({
                  where: { id: accountingPeriodId },
                  select: { startDate: true, endDate: true }
                }))?.endDate
              }
            }
        });
        
        if (journalEntryExists) {
            return new NextResponse("Cannot delete period with existing journal entries.", { status: 409 });
        }

        const accountingPeriod = await prismadb.accountingPeriod.delete({
            where: {
                id: accountingPeriodId,
                businessUnitId,
            }
        });
      
        return NextResponse.json(accountingPeriod);
    } catch (error) {
        console.log('[ACCOUNTING_PERIOD_DELETE]', error);
        return new NextResponse("Internal error", { status: 500 });
    }
};