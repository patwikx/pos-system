"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { CellAction } from "./cell-actions"

export type InventoryItemColumn = {
  id: string
  name: string
  uom: string
  totalQuantityOnHand: number
  locations: string // A summary of locations, e.g., "Main Storeroom, Kitchen Prep"
  isLowStock: boolean
  createdAt: string
}

export const columns: ColumnDef<InventoryItemColumn>[] = [
  { 
    accessorKey: "name", 
    header: "Item Name" 
  },
  { 
    accessorKey: "uom", 
    header: "Unit" 
  },
  {
    accessorKey: "totalQuantityOnHand",
    header: "Total Quantity",
  },
  {
    accessorKey: "locations",
    header: "Locations",
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
  { 
    accessorKey: "createdAt", 
    header: "Date Added" 
  },
  { 
    id: "actions", 
    header: "Actions",
    cell: ({ row }) => <CellAction data={row.original} /> 
  },
];