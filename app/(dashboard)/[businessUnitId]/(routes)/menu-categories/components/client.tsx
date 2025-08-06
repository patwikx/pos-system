"use client";

import { Plus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";

import { columns, MenuCategoryColumn } from "./columns";
import { DataTable } from "@/components/ui/data-table";

interface MenuCategoriesClientProps {
  data: MenuCategoryColumn[];
}

export const MenuCategoriesClient: React.FC<MenuCategoriesClientProps> = ({
  data
}) => {
  const params = useParams();
  const router = useRouter();

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading title={`Menu Categories (${data.length})`} description="Manage categories for your menu" />
        <Button onClick={() => router.push(`/${params.businessUnitId}/menu-categories/new`)}>
          <Plus className="mr-2 h-4 w-4" /> Add New
        </Button>
      </div>
      <DataTable searchKey="name" columns={columns} data={data} />
    </>
  );
};