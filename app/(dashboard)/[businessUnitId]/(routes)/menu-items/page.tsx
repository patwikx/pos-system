import { format } from "date-fns";
import prismadb from "@/lib/db";
import { formatter } from "@/lib/utils";

import { MenuItemColumn } from "./components/columns";
import { MenuItemsClient } from "./components/client";

const MenuItemsPage = async ({
  params,
}: {
  params: Promise<{ businessUnitId: string }>;
}) => {
  const { businessUnitId } = await params;

  const menuItems = await prismadb.menuItem.findMany({
    where: {
      businessUnitId,
    },
    include: {
      category: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const formattedMenuItems: MenuItemColumn[] = menuItems.map((item) => ({
    id: item.id,
    name: item.name,
    isActive: item.isActive,
    price: formatter.format(item.price), // Format price as currency
    category: item.category.name,
    createdAt: format(item.createdAt, "MMMM do, yyyy"),
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <MenuItemsClient data={formattedMenuItems} />
      </div>
    </div>
  );
};

export default MenuItemsPage;
