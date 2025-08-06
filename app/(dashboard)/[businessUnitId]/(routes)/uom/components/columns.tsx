"use client"

import { ColumnDef } from "@tanstack/react-table"

import { CellAction } from "./cell-action"

export type UoMColumn = {
  id: string
  UoM: string;
  createdAt: string;
}

export const columns: ColumnDef<UoMColumn>[] = [
  {
    accessorKey: "UoM",
    header: "Unit of Measure",
  },
  {
    accessorKey: "value",
    header: "Value",
    cell: ({ row }) => (
      <div className="flex items-center gap-x-2">
        {row.original.UoM}
        <div className="h-6 w-6 rounded-full border" style={{ backgroundColor: row.original.UoM }} />
      </div>
    )
  },
  {
    accessorKey: "createdAt",
    header: "Date",
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />
  },
];
