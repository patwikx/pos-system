import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prismadb from '@/lib/db';

export async function PATCH(
  req: Request,
  { params }: { params: { businessUnitId: string, accountingPeriodId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return new NextResponse("Unauthenticated", { status: 401 });

    const body = await req.json();
    const { name, startDate, endDate, status } = body;

    // TODO: Add authorization check

    const accountingPeriod = await prismadb.accountingPeriod.update({
      where: {
        id: params.accountingPeriodId,
        businessUnitId: params.businessUnitId,
      },
      data: { name, startDate, endDate, status }
    });
  
    return NextResponse.json(accountingPeriod);
  } catch (error) {
    console.log('[ACCOUNTING_PERIOD_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};

export async function DELETE(
    req: Request,
    { params }: { params: { businessUnitId: string, accountingPeriodId: string } }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) return new NextResponse("Unauthenticated", { status: 401 });

        // Prevent deleting a period if it contains journal entries
        const journalEntryExists = await prismadb.journalEntry.findFirst({
            where: { accountingPeriodId: params.accountingPeriodId }
        });
        if (journalEntryExists) {
            return new NextResponse("Cannot delete period with existing journal entries.", { status: 409 });
        }

        const accountingPeriod = await prismadb.accountingPeriod.delete({
            where: {
                id: params.accountingPeriodId,
                businessUnitId: params.businessUnitId,
            }
        });
      
        return NextResponse.json(accountingPeriod);
    } catch (error) {
        console.log('[ACCOUNTING_PERIOD_DELETE]', error);
        return new NextResponse("Internal error", { status: 500 });
    }
};