"use client"

import { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { CellAction } from "./cell-actions"

export type AccountingPeriodColumn = {
  id: string
  name: string
  startDate: string
  endDate: string
  status: string
}

export const columns: ColumnDef<AccountingPeriodColumn>[] = [
  { accessorKey: "name", header: "Period Name" },
  { accessorKey: "startDate", header: "Start Date" },
  { accessorKey: "endDate", header: "End Date" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
        const status = row.original.status;
        return <Badge variant={status === 'OPEN' ? 'default' : 'secondary'}>{status}</Badge>
    }
  },
  { id: "actions", cell: ({ row }) => <CellAction data={row.original} /> },
];