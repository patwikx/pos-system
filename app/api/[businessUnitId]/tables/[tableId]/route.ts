import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prismadb from '@/lib/db';

export async function POST(
  req: Request,
  context: { params: Promise<{ businessUnitId: string }> }
) {
  try {
    const { businessUnitId } = await context.params;
    const session = await auth();
    const body = await req.json();
    const { name, status } = body;

    if (!session?.user?.id) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }
    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }
    if (!businessUnitId) {
      return new NextResponse("Business Unit ID is required", { status: 400 });
    }

    // TODO: Authorization: ensure user can create tables in this business unit

    const table = await prismadb.table.create({
      data: {
        name,
        status,
        businessUnitId,
      },
    });

    return NextResponse.json(table);
  } catch (error) {
    console.log('[TABLES_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
