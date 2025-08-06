"use client"

import { ColumnDef } from "@tanstack/react-table"
import { CellAction } from "./cell-actions"


export type ModifierGroupColumn = {
  id: string
  name: string
  createdAt: string
}

export const columns: ColumnDef<ModifierGroupColumn>[] = [
  { accessorKey: "name", header: "Group Name" },
  { accessorKey: "createdAt", header: "Date Created" },
  { id: "actions", cell: ({ row }) => <CellAction data={row.original} /> },
];