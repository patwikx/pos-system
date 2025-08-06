import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prismadb from '@/lib/db';

export async function PATCH(
  req: Request,
  context: { params: Promise<{ businessUnitId: string; terminalId: string }> }
) {
  try {
    const { businessUnitId, terminalId } = await context.params;
    const session = await auth();
    const body = await req.json();
    const { name, description, isActive } = body;

    if (!session?.user?.id) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }
    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }
    if (!terminalId) {
      return new NextResponse("Terminal ID is required", { status: 400 });
    }

    // TODO: Add authorization check

    const posTerminal = await prismadb.posTerminal.update({
      where: {
        id: terminalId,
        businessUnitId,
      },
      data: { name, description, isActive },
    });

    return NextResponse.json(posTerminal);
  } catch (error) {
    console.log('[TERMINAL_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ businessUnitId: string; terminalId: string }> }
) {
  try {
    const { businessUnitId, terminalId } = await context.params;
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }
    if (!terminalId) {
      return new NextResponse("Terminal ID is required", { status: 400 });
    }

    // TODO: Add authorization check

    const posTerminal = await prismadb.posTerminal.delete({
      where: {
        id: terminalId,
        businessUnitId,
      },
    });

    return NextResponse.json(posTerminal);
  } catch (error) {
    console.log('[TERMINAL_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
