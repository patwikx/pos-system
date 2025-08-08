"use client"

import { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { CellAction } from "./cell-actions"
import { PeriodStatus } from "@prisma/client"

export type AccountingPeriodColumn = {
  id: string
  name: string
  startDate: string
  endDate: string
  status: PeriodStatus
  journalEntryCount: number
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
        return <Badge variant={status === PeriodStatus.OPEN ? 'default' : 'secondary'}>{status}</Badge>
    }
  },
  {
    accessorKey: "journalEntryCount",
    header: "Journal Entries",
    cell: ({ row }) => (
      <Badge variant="outline">{row.original.journalEntryCount}</Badge>
    )
  },
  { id: "actions", cell: ({ row }) => <CellAction data={row.original} /> },
];