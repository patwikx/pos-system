import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prismadb from '@/lib/db';

// Handler for UPDATING the business unit name
export async function PATCH(
  req: Request,
  context: { params: Promise<{ businessUnitId: string }> }
) {
  try {
    const { businessUnitId } = await context.params;
    const session = await auth();
    const body = await req.json();
    const { name } = body;

    if (!session?.user?.id) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }
    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }
    if (!businessUnitId) {
      return new NextResponse("Business Unit ID is required", { status: 400 });
    }

    // Authorization: Check if the user is an Administrator for this unit
    const userAssignment = session.user.assignments.find(
      (a) => a.businessUnitId === businessUnitId
    );

    if (userAssignment?.role.role !== 'Administrator') {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    const businessUnit = await prismadb.businessUnit.update({
      where: { id: businessUnitId },
      data: { name },
    });

    return NextResponse.json(businessUnit);
  } catch (error) {
    console.log('[BUSINESS_UNIT_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

// Handler for DELETING the business
