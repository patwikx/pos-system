"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { DocumentStatus } from "@prisma/client"
import { ARInvoiceColumn } from "@/types/financials-types"
import { ARInvoiceCellAction } from "./ar-invoice-cell-actions"


export const columns: ColumnDef<ARInvoiceColumn>[] = [
  {
    accessorKey: "docNum",
    header: "Invoice #",
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
    accessorKey: "postingDate",
    header: "Invoice Date",
  },
  {
    accessorKey: "dueDate",
    header: "Due Date",
    cell: ({ row }) => {
      const isOverdue = row.original.overdue;
      return (
        <div className="flex items-center gap-2">
          <span className={isOverdue ? "text-red-600 font-medium" : ""}>
            {row.original.dueDate}
          </span>
          {isOverdue && <Badge variant="destructive" className="text-xs">Overdue</Badge>}
        </div>
      );
    }
  },
  {
    accessorKey: "totalAmount",
    header: "Total Amount",
    cell: ({ row }) => (
      <span className="font-mono font-medium">{row.original.totalAmount}</span>
    )
  },
  {
    accessorKey: "amountPaid",
    header: "Amount Paid",
    cell: ({ row }) => (
      <span className="font-mono text-green-600 font-medium">{row.original.amountPaid}</span>
    )
  },
  {
    accessorKey: "balance",
    header: "Balance",
    cell: ({ row }) => {
      const balance = parseFloat(row.original.balance.replace(/[^0-9.-]/g, ''));
      return (
        <span className={`font-mono font-medium ${balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
          {row.original.balance}
        </span>
      );
    }
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      const variant = 
        status === DocumentStatus.OPEN ? 'default' :
        status === DocumentStatus.CLOSED ? 'secondary' :
        'destructive';
      
      return <Badge variant={variant}>{status}</Badge>
    }
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <ARInvoiceCellAction data={row.original} />
  },
];

export type { ARInvoiceColumn };