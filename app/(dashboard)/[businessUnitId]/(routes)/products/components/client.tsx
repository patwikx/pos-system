"use client";

import { Plus } from 'lucide-react';
import { useParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";

// Components
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Separator } from "@/components/ui/separator";
import { ApiList } from "@/components/ui/api-list";
import { Input } from "@/components/ui/input";
import { Heading } from "@/components/ui/heading";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ProductColumn, columns } from "./columns";

interface ProductsClientProps {
  data: ProductColumn[];
}

export const ProductsClient: React.FC<ProductsClientProps> = ({ data }) => {
  const params = useParams();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const searchContent = `${item.name} ${item.barCode}`.toLowerCase();
      
      const matchesSearch = searchContent.includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      
      // --- THIS IS THE LOGIC THAT FULFILLS YOUR REQUEST ---
      // It shows ONLY archived products when checked, and ONLY active ones when unchecked.
      const matchesArchived = item.isArchived === showArchived;

      return matchesSearch && matchesCategory && matchesArchived;
    });
  }, [data, searchTerm, categoryFilter, showArchived]);

  const uniqueCategories = useMemo(() => {
    const categories = new Set<string>();
    data.forEach((item) => {
      if (item.category) {
        categories.add(item.category);
      }
    });
    return Array.from(categories);
  }, [data]);

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading title={`Products (${filteredData.length})`} description="Manage products for your store" />
        <Button onClick={() => router.push(`/${params.storeId}/products/new`)}>
          <Plus className="mr-2 h-4 w-4" /> Add New
        </Button>
      </div>
      <Separator />
      <div className="flex flex-wrap items-center gap-4 py-4">
        <Input
          placeholder="Search by name or barcode..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {uniqueCategories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center space-x-2">
            <Checkbox
                id="show-archived"
                checked={showArchived}
                onCheckedChange={(checked) => setShowArchived(!!checked)}
            />
            <Label htmlFor="show-archived" className="cursor-pointer whitespace-nowrap">
                Show Deactivated Only
            </Label>
        </div>
      </div>
      <DataTable searchKey="name" columns={columns} data={filteredData} />
      <Heading title="API" description="API Calls for Products" />
      <Separator />
      <ApiList entityName="products" entityIdName="productId" />
    </>
  );
};