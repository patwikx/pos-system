"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { CellAction } from "./cell-actions"

export type InventoryItemColumn = {
  id: string
  name: string
  uom: string
  quantityOnHand: number
  isLowStock: boolean
  createdAt: string
}

export const columns: ColumnDef<InventoryItemColumn>[] = [
   { accessorKey: "itemCome", header: "Item Code" },
  { accessorKey: "name", header: "Item Name" },
  { accessorKey : "description", header: "Description" },
  { accessorKey: "uom", header: "Unit of Measure" },
  {
    accessorKey: "quantityOnHand",
    header: "Quantity on Hand",
  },
  {
    accessorKey: "isLowStock",
    header: "Stock Status",
    cell: ({ row }) => (
      <Badge variant={row.original.isLowStock ? "destructive" : "default"}>
        {row.original.isLowStock ? "Low Stock" : "In Stock"}
      </Badge>
    )
  },
  { accessorKey: "createdAt", header: "Date Added" },
  { id: "actions", header: "Actions", cell: ({ row }) => <CellAction data={row.original} /> },
];