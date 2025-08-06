"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { DiscountType } from "@prisma/client"
import { CellAction } from "./cell-actions"

export type DiscountColumn = {
  id: string
  name: string
  value: string // We format this as a string
  type: DiscountType
  isActive: boolean
  createdAt: string
}

export const columns: ColumnDef<DiscountColumn>[] = [
  { accessorKey: "name", header: "Discount Name" },
  { accessorKey: "value", header: "Value" },
  { accessorKey: "type", header: "Type", cell: ({ row }) => <Badge variant="secondary">{row.original.type}</Badge> },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? "default" : "outline"}>
        {row.original.isActive ? "Active" : "Inactive"}
      </Badge>
    )
  },
  { accessorKey: "createdAt", header: "Date Added" },
  { id: "actions", header: "Actions", cell: ({ row }) => <CellAction data={row.original} /> },
];