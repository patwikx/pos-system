"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { TableStatus } from "@prisma/client"
import { CellAction } from "./cell-actions"

export type TableColumn = {
  id: string
  name: string
  status: TableStatus
  createdAt: string
}

export const columns: ColumnDef<TableColumn>[] = [
  {
    accessorKey: "name",
    header: "Table Name / Number",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
        const status = row.original.status;
        const variant: "default" | "secondary" | "destructive" = 
            status === 'AVAILABLE' ? 'default' :
            status === 'OCCUPIED' ? 'secondary' :
            'destructive';
        
        return <Badge variant={variant}>{status}</Badge>
    }
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