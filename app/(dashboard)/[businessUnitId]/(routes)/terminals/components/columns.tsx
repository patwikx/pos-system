"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { CellAction } from "./cell-actions"

export type PosTerminalColumn = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
}

export const columns: ColumnDef<PosTerminalColumn>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => row.original.description || 'N/A',
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
    accessorKey: "createdAt",
    header: "Date Created",
  },
  {
    id: "actions",
    header: "Actions",
    enableSorting: true,
    cell: ({ row }) => <CellAction data={row.original} />
  },
];