import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prismadb from '@/lib/db';

// Update a user's role in a business unit
export async function PATCH(
  req: Request,
  context: { params: Promise<{ businessUnitId: string; userId: string }> }
) {
  try {
    const { businessUnitId, userId } = await context.params;
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }
    
    // TODO: Authorization

    const body = await req.json();
    const { roleId } = body;
    if (!roleId) {
      return new NextResponse("Role ID is required", { status: 400 });
    }

    const updatedAssignment = await prismadb.userBusinessUnit.update({
      where: {
        userId_businessUnitId: {
          userId,
          businessUnitId,
        }
      },
      data: { roleId }
    });
  
    return NextResponse.json(updatedAssignment);
  } catch (error) {
    console.log('[USER_MANAGEMENT_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

// Remove a user from a business unit
export async function DELETE(
  req: Request,
  context: { params: Promise<{ businessUnitId: string; userId: string }> }
) {
  try {
    const { businessUnitId, userId } = await context.params;
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    // TODO: Authorization

    const deletedAssignment = await prismadb.userBusinessUnit.delete({
      where: {
        userId_businessUnitId: {
          userId,
          businessUnitId,
        }
      }
    });
      
    return NextResponse.json(deletedAssignment);
  } catch (error) {
    console.log('[USER_MANAGEMENT_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
