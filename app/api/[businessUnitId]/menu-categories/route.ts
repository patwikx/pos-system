import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prismadb from "@/lib/db";

// GET all categories for a business unit
export async function GET(
  req: Request,
  { params }: { params: { businessUnitId: string } }
) {
  try {
    const { businessUnitId } = params;

    const categories = await prismadb.menuCategory.findMany({
      where: { businessUnitId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("[MENU_CATEGORIES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// Create a new category
export async function POST(
  req: Request,
  { params }: { params: { businessUnitId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return new NextResponse("Unauthenticated", { status: 401 });

    const { businessUnitId } = params;
    const body = await req.json();
    const { name, isActive } = body;

    if (!name) return new NextResponse("Name is required", { status: 400 });

    const category = await prismadb.menuCategory.create({
      data: {
        name,
        isActive: isActive ?? true,
        businessUnitId,
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error("[MENU_CATEGORIES_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
