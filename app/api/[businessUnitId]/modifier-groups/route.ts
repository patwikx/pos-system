import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prismadb from '@/lib/db';

export async function POST(
  req: Request,
  { params }: { params: { businessUnitId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return new NextResponse("Unauthenticated", { status: 401 });

    const body = await req.json();
    const { name } = body;

    if (!name) return new NextResponse("Name is required", { status: 400 });

    const modifierGroup = await prismadb.modifierGroup.create({
      data: {
        name,
        businessUnitId: params.businessUnitId
      }
    });
  
    return NextResponse.json(modifierGroup);
  } catch (error) {
    console.log('[MODIFIER_GROUPS_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};