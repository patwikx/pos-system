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

    // TODO: Authorization: ensure current user is an Admin/Manager of this business unit

    const body = await req.json();
    const { username, roleId } = body;

    if (!username) {
      return new NextResponse("Username is required", { status: 400 });
    }
    if (!roleId) {
      return new NextResponse("Role ID is required", { status: 400 });
    }

    // Find the user to be added
    const userToAdd = await prismadb.user.findUnique({
      where: { username }
    });
    if (!userToAdd) {
      return new NextResponse("User with that username not found", { status: 404 });
    }

    // Check if the user is already assigned
    const existingAssignment = await prismadb.userBusinessUnit.findUnique({
      where: {
        userId_businessUnitId: {
          userId: userToAdd.id,
          businessUnitId
        }
      }
    });
    if (existingAssignment) {
      return new NextResponse("User is already assigned to this business unit", { status: 409 });
    }

    // Create the assignment
    const newAssignment = await prismadb.userBusinessUnit.create({
      data: {
        userId: userToAdd.id,
        businessUnitId,
        roleId,
      }
    });
  
    return NextResponse.json(newAssignment);
  } catch (error) {
    console.log('[USER_MANAGEMENT_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
