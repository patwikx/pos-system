"use client"

import { ColumnDef } from "@tanstack/react-table"

import { CellAction } from "./cell-action"

export type ProductColumn = {
  id: string;
  barCode: string;
  name: string;
  itemDesc: string;
  price: string;
  category: string;
  size: string;
  color: string;
  createdAt: string;
  isFeatured: boolean;
  isArchived: boolean;
  UoM: string;
}

export const columns: ColumnDef<ProductColumn>[] = [
  {
    accessorKey: "barCode",
    header: "Barcode",
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "itemDesc",
    header: "Item Description",
  },
  {
    accessorKey: "price",
    header: "Price",
  },
  {
    accessorKey: "UoM",
    header: "UoM",
  },
  {
    accessorKey: "category",
    header: "Category",
  },
  {
    accessorKey: "isFeatured",
    header: "Popular?",
  },
  {
    accessorKey: "isArchived",
    header: "Out of stock?",
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />
  },
];
