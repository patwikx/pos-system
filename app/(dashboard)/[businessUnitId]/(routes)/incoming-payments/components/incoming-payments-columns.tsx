"use client"

import { ColumnDef } from "@tanstack/react-table"
import { IncomingPaymentColumn } from "@/types/financials-types"
import { IncomingPaymentCellAction } from "./incoming-payments-cell-actions";


export const columns: ColumnDef<IncomingPaymentColumn>[] = [
  {
    accessorKey: "docNum",
    header: "Payment #",
    cell: ({ row }) => (
      <span className="font-mono font-medium">{row.original.docNum}</span>
    )
  },
  {
    accessorKey: "customerName",
    header: "Customer",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.customerName}</span>
    )
  },
  {
    accessorKey: "paymentDate",
    header: "Payment Date",
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => (
      <span className="font-mono text-green-600 font-medium">{row.original.amount}</span>
    )
  },
  {
    accessorKey: "bankAccount",
    header: "Bank Account",
  },
  {
    accessorKey: "createdAt",
    header: "Created",
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <IncomingPaymentCellAction data={row.original} />
  },
];

export type { IncomingPaymentColumn };