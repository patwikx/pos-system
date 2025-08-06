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

    const { name, description, isActive } = body;

    if (!session?.user?.id) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }
    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }
    if (!businessUnitId) {
      return new NextResponse("Business Unit ID is required", { status: 400 });
    }

    // TODO: Add authorization to ensure user can create in this business unit

    const posTerminal = await prismadb.posTerminal.create({
      data: {
        name,
        description,
        isActive,
        businessUnitId
      }
    });

    return NextResponse.json(posTerminal);
  } catch (error) {
    console.log('[TERMINALS_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
