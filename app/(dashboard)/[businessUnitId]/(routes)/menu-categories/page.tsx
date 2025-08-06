import { format } from "date-fns";
import prismadb from "@/lib/db";

import { MenuCategoryColumn } from "./components/columns";
import { MenuCategoriesClient } from "./components/client";

export default async function MenuCategoriesPage({
  params
}: {
  params: Promise<{ businessUnitId: string }>;
}) {
  // ✅ Await params
  const { businessUnitId } = await params;

  // ✅ Query the `menuCategory` model
  const menuCategories = await prismadb.menuCategory.findMany({
    where: {
      businessUnitId
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  // ✅ Format the data to match the new `MenuCategoryColumn` shape
  const formattedMenuCategories: MenuCategoryColumn[] = menuCategories.map((item) => ({
    id: item.id,
    name: item.name,
    prepStation: item.prepStation, // keep if your DB model has this
    createdAt: format(item.createdAt, "MMMM do, yyyy"),
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <MenuCategoriesClient data={formattedMenuCategories} />
      </div>
    </div>
  );
}
