"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { BusinessPartnerType } from "@prisma/client"
import { BusinessPartnerCellAction } from "./business-partner-cell-actions"

export type BusinessPartnerColumn = {
  id: string
  bpCode: string
  name: string
  type: BusinessPartnerType
  phone: string | null
  email: string | null
  loyaltyPoints: number
  createdAt: string
}

export const columns: ColumnDef<BusinessPartnerColumn>[] = [
  {
    accessorKey: "bpCode",
    header: "BP Code",
    cell: ({ row }) => (
      <span className="font-mono font-medium">{row.original.bpCode}</span>
    )
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.name}</span>
    )
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => {
      const type = row.original.type;
      const variant = 
        type === BusinessPartnerType.CUSTOMER ? 'default' :
        type === BusinessPartnerType.VENDOR ? 'secondary' :
        'outline';
      
      return <Badge variant={variant}>{type}</Badge>
    }
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => row.original.phone || '-'
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => row.original.email || '-'
  },
  {
    accessorKey: "loyaltyPoints",
    header: "Loyalty Points",
    cell: ({ row }) => (
      <Badge variant="outline">{row.original.loyaltyPoints}</Badge>
    )
  },
  {
    accessorKey: "createdAt",
    header: "Created",
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <BusinessPartnerCellAction data={row.original} />
  },
];