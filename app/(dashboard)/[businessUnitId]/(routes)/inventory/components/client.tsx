"use client";

import { Plus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { InventoryItemColumn, columns } from "./columns";

interface InventoryClientProps { data: InventoryItemColumn[]; }

export const InventoryClient: React.FC<InventoryClientProps> = ({ data }) => {
  const params = useParams();
  const router = useRouter();

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading title={`Inventory Items (${data.length})`} description="Manage raw ingredients for your business unit" />
        <Button onClick={() => router.push(`/${params.businessUnitId}/inventory/new`)}>
          <Plus className="mr-2 h-4 w-4" /> Add New
        </Button>
      </div>
      <Separator />
      <DataTable searchKey="name" columns={columns} data={data} />
    </>
  );
};