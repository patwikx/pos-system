import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prismadb from "@/lib/db";

// Update a category
export async function PATCH(
  req: Request,
  { params }: { params: { businessUnitId: string; categoryId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return new NextResponse("Unauthenticated", { status: 401 });

    const body = await req.json();
    const { name, isActive } = body;

    if (!name) return new NextResponse("Name is required", { status: 400 });

    const category = await prismadb.menuCategory.update({
      where: { id: params.categoryId },
      data: { name, isActive },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error("[MENU_CATEGORY_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// Delete a category
export async function DELETE(
  req: Request,
  { params }: { params: { businessUnitId: string; categoryId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return new NextResponse("Unauthenticated", { status: 401 });

    const category = await prismadb.menuCategory.delete({
      where: { id: params.categoryId },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error("[MENU_CATEGORY_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
