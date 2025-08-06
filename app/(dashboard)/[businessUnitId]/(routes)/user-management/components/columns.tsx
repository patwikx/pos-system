"use client"

import { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge";
import { CellAction } from "./cell-actions";

export type UserManagementColumn = {
  userId: string;
  name: string | null;
  username: string | null;
  role: string;
  roleId: string;
}

export const columns: ColumnDef<UserManagementColumn>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "username", header: "Username (Email)" },
  { accessorKey: "role", header: "Role", cell: ({ row }) => <Badge>{row.original.role}</Badge>},
  { id: "actions", header: "Actions", cell: ({ row }) => <CellAction data={row.original} /> },
];