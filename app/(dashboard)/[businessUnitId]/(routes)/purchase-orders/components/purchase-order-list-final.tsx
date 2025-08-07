"use client";

import React, { useState, useEffect, ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, ChevronLeft, ChevronRight, Eye, Plus } from 'lucide-react';
import { format } from "date-fns";
import { DocumentStatus } from "@prisma/client";
import {
  getPurchaseOrders,
  getBusinessUnits,
} from "@/lib/actions/pr-po-actions";
import type {
  PurchaseOrderWithDetails,
  PurchaseOrderFilters,
  BusinessUnitOption,
  PaginatedResponse,
} from "@/types/pr-po-types";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Custom hook for debouncing input
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface PurchaseOrderListProps {
  currentUserId: string;
  userRole?: string;
  businessUnitId: string;
  businessUnits: BusinessUnitOption[]; // Pass business units from server
}

type StatusFilterValue = DocumentStatus | "all";
type BusinessUnitFilterValue = string | "all";

export function PurchaseOrderList({
  currentUserId,
  userRole,
  businessUnitId,
  businessUnits: initialBusinessUnits,
}: PurchaseOrderListProps) {
  const [orders, setOrders] = useState<PurchaseOrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [businessUnitFilter, setBusinessUnitFilter] = useState<BusinessUnitFilterValue>(businessUnitId); // Default to current business unit

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    loadData();
  }, [currentPage, statusFilter, businessUnitFilter, debouncedSearchTerm]);

  const loadData = async () => {
    setLoading(true);
    try {
      const filters: PurchaseOrderFilters = {};
      if (statusFilter !== "all") filters.status = statusFilter;

      if (userRole === 'admin') {
        if (businessUnitFilter !== "all") filters.businessUnitId = businessUnitFilter;
      } else {
        filters.businessUnitId = businessUnitId; // Non-admins only see their BU's POs
      }

      if (debouncedSearchTerm) filters.searchTerm = debouncedSearchTerm;

      const result = await getPurchaseOrders(filters, {
        page: currentPage,
        limit: pageSize,
      });
      setOrders(result.data);
      setTotalPages(result.pagination.totalPages);
    } catch (error) {
      console.error("Error loading purchase orders:", error);
      toast.error("Failed to load purchase orders.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: DocumentStatus) => {
    const statusConfig = {
      [DocumentStatus.OPEN]: { variant: "default" as const, label: "Open" },
      [DocumentStatus.CLOSED]: { variant: "secondary" as const, label: "Closed" },
      [DocumentStatus.CANCELLED]: { variant: "destructive" as const, label: "Cancelled" },
    };
    const config = statusConfig[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Purchase Orders</h1>
            <Button onClick={() => router.push(`/${businessUnitId}/purchase-orders/new`)}>
                <Plus className="mr-2 h-4 w-4" /> New Purchase Order
            </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by PO#, PR#, or vendor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilterValue)}>
                <SelectTrigger className="w-full md:w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value={DocumentStatus.OPEN}>Open</SelectItem>
                  <SelectItem value={DocumentStatus.CLOSED}>Closed</SelectItem>
                  <SelectItem value={DocumentStatus.CANCELLED}>Cancelled</SelectItem>
                </SelectContent>
              </Select>
              {userRole === 'admin' && (
                <Select value={businessUnitFilter} onValueChange={(value) => setBusinessUnitFilter(value as BusinessUnitFilterValue)}>
                    <SelectTrigger className="w-full md:w-[200px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                    <SelectItem value="all">All Business Units</SelectItem>
                    {initialBusinessUnits.map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>)}
                    </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Business Unit</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Posting Date</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={8} className="h-32 text-center">Loading...</TableCell></TableRow>
                  ) : orders.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">No purchase orders found.</TableCell></TableRow>
                  ) : (
                    orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.poNumber}</TableCell>
                        <TableCell>{order.businessPartner.name}</TableCell>
                        <TableCell>{order.businessUnit.name}</TableCell>
                        <TableCell>
                          ₱{order.totalAmount.toLocaleString('en-PH', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell>{format(new Date(order.postingDate), "MMM dd, yyyy")}</TableCell>
                        <TableCell>{order.owner.name || '-'}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => router.push(`/${businessUnitId}/purchase-orders/${order.id}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <span className="text-sm font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
