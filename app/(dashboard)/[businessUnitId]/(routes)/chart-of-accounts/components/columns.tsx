"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { CellAction } from "./cell-actions"


export type GlAccountColumn = {
  id: string
  accountCode: string
  name: string
  accountType: string
  balance: string
  transactionCount: number
  createdAt: string
}

export const columns: ColumnDef<GlAccountColumn>[] = [
  {
    accessorKey: "accountCode",
    header: "Account Code",
    cell: ({ row }) => (
      <span className="font-mono font-medium">{row.original.accountCode}</span>
    )
  },
  {
    accessorKey: "name",
    header: "Account Name",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.name}</span>
    )
  },
  {
    accessorKey: "accountType",
    header: "Type",
    cell: ({ row }) => {
      const type = row.original.accountType;
      const variant = 
        type === 'ASSET' ? 'default' :
        type === 'LIABILITY' ? 'secondary' :
        type === 'EQUITY' ? 'outline' :
        type === 'REVENUE' ? 'default' :
        'destructive';
      
      return <Badge variant={variant}>{type}</Badge>
    }
  },
  {
    accessorKey: "balance",
    header: "Balance",
    cell: ({ row }) => {
      const balance = parseFloat(row.original.balance.replace(/[^0-9.-]/g, ''));
      return (
        <span className={`font-mono font-medium ${balance < 0 ? 'text-red-600' : balance > 0 ? 'text-green-600' : 'text-gray-500'}`}>
          {row.original.balance}
        </span>
      );
    }
  },
  {
    accessorKey: "transactionCount",
    header: "Transactions",
    cell: ({ row }) => (
      <Badge variant="outline">{row.original.transactionCount}</Badge>
    )
  },
  {
    accessorKey: "createdAt",
    header: "Created",
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <CellAction data={row.original} />
  },
];