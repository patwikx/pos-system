"use client"

import { ColumnDef } from "@tanstack/react-table"
import { CellAction } from "./cell-actions"


export type ModifierColumn = {
  id: string
  name: string
  priceChange: string
  group: string
  createdAt: string
}

export const columns: ColumnDef<ModifierColumn>[] = [
  { accessorKey: "name", header: "Modifier Name" },
  { accessorKey: "priceChange", header: "Price Change" },
  { accessorKey: "group", header: "Assigned Group" },
  { accessorKey: "createdAt", header: "Date Created" },
  { id: "actions", cell: ({ row }) => <CellAction data={row.original} /> },
];