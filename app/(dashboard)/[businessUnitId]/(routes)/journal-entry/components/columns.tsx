"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { DocumentStatus } from "@prisma/client"
import { CellAction } from "./cell-actions"


export type JournalEntryColumn = {
  id: string
  docNum: string
  postingDate: string
  author: string
  remarks: string
  totalDebit: string
  totalCredit: string
  status: DocumentStatus
  createdAt: string
}

export const columns: ColumnDef<JournalEntryColumn>[] = [
  {
    accessorKey: "docNum",
    header: "Document #",
    cell: ({ row }) => (
      <span className="font-mono font-medium">{row.original.docNum}</span>
    )
  },
  {
    accessorKey: "postingDate",
    header: "Posting Date",
  },
  {
    accessorKey: "author",
    header: "Created By",
  },
  {
    accessorKey: "remarks",
    header: "Remarks",
    cell: ({ row }) => (
      <span className="max-w-[200px] truncate block">
        {row.original.remarks || '-'}
      </span>
    )
  },
  {
    accessorKey: "totalDebit",
    header: "Total Debit",
    cell: ({ row }) => (
      <span className="font-mono text-green-600 font-medium">
        {row.original.totalDebit}
      </span>
    )
  },
  {
    accessorKey: "totalCredit",
    header: "Total Credit",
    cell: ({ row }) => (
      <span className="font-mono text-blue-600 font-medium">
        {row.original.totalCredit}
      </span>
    )
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      const variant = 
        status === 'OPEN' ? 'default' :
        status === 'CLOSED' ? 'secondary' :
        'destructive';
      
      return <Badge variant={variant}>{status}</Badge>
    }
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <CellAction data={row.original} />
  },
];