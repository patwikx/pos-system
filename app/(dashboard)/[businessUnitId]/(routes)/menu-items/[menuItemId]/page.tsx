import prismadb from "@/lib/db";
import { MenuItemForm } from "./components/menu-items-form";

const MenuItemPage = async ({
  params,
}: {
  params: Promise<{ menuItemId: string; businessUnitId: string }>;
}) => {
  const { menuItemId, businessUnitId } = await params;

  // Fetch the specific menu item to edit, or null if creating a new one
  const menuItem = await prismadb.menuItem.findUnique({
    where: {
      id: menuItemId,
    },
  });

  // Fetch all categories for this business unit to populate the dropdown
  const categories = await prismadb.menuCategory.findMany({
    where: {
      businessUnitId,
    },
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <MenuItemForm categories={categories} initialData={menuItem} />
      </div>
    </div>
  );
};

export default MenuItemPage;
