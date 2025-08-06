"use client";

import { Plus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
//import { ApiList } from "@/components/ui/api-list";

import { columns, MenuItemColumn } from "./columns";

interface MenuItemsClientProps {
  data: MenuItemColumn[];
}

export const MenuItemsClient: React.FC<MenuItemsClientProps> = ({ data }) => {
  const params = useParams();
  const router = useRouter();

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading title={`Menu Items (${data.length})`} description="Manage items for your menu" />
        <Button onClick={() => router.push(`/${params.businessUnitId}/menu-items/new`)}>
          <Plus className="mr-2 h-4 w-4" /> Add New
        </Button>
      </div>

      <DataTable searchKey="name" columns={columns} data={data} />
      <Heading title="API" description="API Calls for Menu Items" />
      <Separator />

      {/*
      <ApiList entityName="menu-items" entityIdName="menuItemId" />
      */}
    </>
  );
};