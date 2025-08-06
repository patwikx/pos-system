"use client"

import { ColumnDef } from "@tanstack/react-table"
import { CellAction } from "./cell-action"
import { Badge } from "@/components/ui/badge"

// This type defines the shape of our data for the table
export type MenuCategoryColumn = {
  id: string
  name: string
  prepStation: string | null // From your schema, this is optional
  createdAt: string
  isActive: boolean
}

export const columns: ColumnDef<MenuCategoryColumn>[] = [
  {
    accessorKey: "menuCode",
    header: "Code",
    cell: ({ row }) => row.original.id, // Display the ID directly
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "description",
    header: "Description",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? "default" : "destructive"}>
        {row.original.isActive ? "Active" : "Inactive"}
      </Badge>
    )
  },
  {
    accessorKey: "prepStation",
    header: "Prep Station",
    cell: ({ row }) => row.original.prepStation || 'N/A' // Display 'N/A' if null
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