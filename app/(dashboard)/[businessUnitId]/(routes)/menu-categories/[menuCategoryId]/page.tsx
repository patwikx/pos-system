import prismadb from "@/lib/db";
import { MenuCategoryForm } from "./components/category-form";

export default async function MenuCategoryPage({
  params
}: {
  params: Promise<{ menuCategoryId: string }>;
}) {
  // ✅ Await params
  const { menuCategoryId } = await params;

  // ✅ Fetch the specific menu category to edit
  const menuCategory = await prismadb.menuCategory.findUnique({
    where: {
      id: menuCategoryId
    }
  });

  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        {/* ✅ Pass only the initialData prop to the form */}
        <MenuCategoryForm initialData={menuCategory} />
      </div>
    </div>
  );
}
