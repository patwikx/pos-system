"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { CellAction } from "./cell-actions"


export type MenuItemColumn = {
  id: string
  name: string
  isActive: boolean
  price: string
  category: string
  createdAt: string
}

export const columns: ColumnDef<MenuItemColumn>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? "default" : "outline"}>
        {row.original.isActive ? "Active" : "Inactive"}
      </Badge>
    )
  },
  {
    accessorKey: "price",
    header: "Price",
  },
  {
    accessorKey: "category",
    header: "Category",
  },
  {
    accessorKey: "createdAt",
    header: "Date Created",
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <CellAction data={row.original} />
  },
];