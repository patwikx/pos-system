"use client"

import { ColumnDef } from "@tanstack/react-table"
import { OutgoingPaymentColumn } from "@/types/financials-types"
import { OutgoingPaymentCellAction } from "./outgoing-payments-cell-actions"

export const columns: ColumnDef<OutgoingPaymentColumn>[] = [
  {
    accessorKey: "docNum",
    header: "Payment #",
    cell: ({ row }) => (
      <span className="font-mono font-medium">{row.original.docNum}</span>
    )
  },
  {
    accessorKey: "vendorName",
    header: "Vendor",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.vendorName}</span>
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
      <span className="font-mono text-red-600 font-medium">{row.original.amount}</span>
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
    cell: ({ row }) => <OutgoingPaymentCellAction data={row.original} />
  },
];

export type { OutgoingPaymentColumn };