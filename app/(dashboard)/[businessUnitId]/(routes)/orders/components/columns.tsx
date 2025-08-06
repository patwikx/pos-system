"use client"

import { ColumnDef } from "@tanstack/react-table"
import { CellAction } from "./cell-action"
import { Badge } from "@/components/ui/badge"
import { OrderStatus } from "@prisma/client"

export type OrderColumn = {
  id: string
  items: string // A summary of item names
  server: string | null
  table: string | null
  totalPrice: string
  status: OrderStatus
  isPaid: boolean
  createdAt: string
}

export const columns: ColumnDef<OrderColumn>[] = [
  {
    accessorKey: "items",
    header: "Items",
  },
  {
    accessorKey: "server",
    header: "Server/Cashier",
  },
  {
    accessorKey: "table",
    header: "Table",
  },
  {
    accessorKey: "totalPrice",
    header: "Total",
  },
  {
    accessorKey: "status",
    header: "Order Status",
    cell: ({ row }) => <Badge variant="outline">{row.original.status}</Badge>
  },
  {
    accessorKey: "isPaid",
    header: "Paid",
    cell: ({ row }) => (
      <Badge variant={row.original.isPaid ? "default" : "destructive"}>
        {row.original.isPaid ? "Yes" : "No"}
      </Badge>
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