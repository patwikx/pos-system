"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { BankAccountColumn } from "@/types/financials-types"
import { BankAccountCellAction } from "./bank-accounts-cell-actions";


export const columns: ColumnDef<BankAccountColumn>[] = [
  {
    accessorKey: "name",
    header: "Account Name",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.name}</span>
    )
  },
  {
    accessorKey: "bankName",
    header: "Bank",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.bankName}</span>
    )
  },
  {
    accessorKey: "accountNumber",
    header: "Account Number",
    cell: ({ row }) => (
      <span className="font-mono">{row.original.accountNumber}</span>
    )
  },
  {
    accessorKey: "glAccountCode",
    header: "GL Account",
    cell: ({ row }) => (
      <Badge variant="outline">{row.original.glAccountCode}</Badge>
    )
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
      <Badge variant="secondary">{row.original.transactionCount}</Badge>
    )
  },
  {
    accessorKey: "createdAt",
    header: "Created",
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <BankAccountCellAction data={row.original} />
  },
];

export type { BankAccountColumn };