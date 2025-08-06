"use client";

import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";

import { columns, OrderColumn } from "./columns";

interface OrderClientProps {
  data: OrderColumn[];
}

export const OrdersClient: React.FC<OrderClientProps> = ({ data }) => {
  return (
    <>
      <Heading title={`Orders (${data.length})`} description="View and manage orders for your business unit" />
      <Separator />
      <DataTable searchKey="items" columns={columns} data={data} />
    </>
  );
};