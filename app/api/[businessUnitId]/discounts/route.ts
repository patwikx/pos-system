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
    if (!session?.user?.id) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    const body = await req.json();
    const { name, value, type, description, isActive } = body;

    if (!name) return new NextResponse("Name is required", { status: 400 });
    if (value === undefined || value === null) return new NextResponse("Value is required", { status: 400 });
    if (!type) return new NextResponse("Type is required", { status: 400 });

    const discount = await prismadb.discount.create({
      data: {
        name,
        value,
        type,
        description,
        isActive,
        businessUnitId
      }
    });

    return NextResponse.json(discount);
  } catch (error) {
    console.log('[DISCOUNTS_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
