"use client";

import { Plus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
//import { ApiList } from "@/components/ui/api-list";

import { columns, ModifierGroupColumn } from "./columns";

interface ModifierGroupsClientProps {
  data: ModifierGroupColumn[];
}

export const ModifierGroupsClient: React.FC<ModifierGroupsClientProps> = ({
  data
}) => {
  const params = useParams();
  const router = useRouter();

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading title={`Modifier Groups (${data.length})`} description="Manage groups for your menu item modifiers" />
        <Button onClick={() => router.push(`/${params.businessUnitId}/modifier-groups/new`)}>
          <Plus className="mr-2 h-4 w-4" /> Add New
        </Button>
      </div>
      
      <Separator />
      <DataTable searchKey="name" columns={columns} data={data} />
      {/*
      <Heading title="API" description="API Calls for Modifier Groups" />
      <Separator />
      <ApiList entityName="modifier-groups" entityIdName="modifierGroupId" />
      */}
    </>
  );
};