"use client";

import React, { useState, useEffect, ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { format } from "date-fns";
import { DocumentStatus } from "@prisma/client"; // FIX: Use DocumentStatus
import { getPurchaseOrders } from "@/lib/actions/pr-po-actions";
import type {
  PurchaseOrderWithDetails,
  PurchaseOrderFilters,
  BusinessPartnerOption, // FIX: Use BusinessPartnerOption for vendors
  PaginatedResponse,
} from "@/types/pr-po-types";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PurchaseOrderDetails } from "./po-details";

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

interface PurchaseOrderListProps {
  currentUserId: string;
  userRole?: string;
  businessUnitId: string;
  initialData: PaginatedResponse<PurchaseOrderWithDetails>;
  suppliers: BusinessPartnerOption[]; // FIX: Prop name is suppliers, but type is BusinessPartnerOption
}

type StatusFilterValue = DocumentStatus | "all";

type StatusConfig = {
    variant: ComponentProps<typeof Badge>["variant"];
    label: string;
    className?: string;
};

export function PurchaseOrderList({
  currentUserId,
  userRole,
  businessUnitId,
  initialData,
  suppliers,
}: PurchaseOrderListProps) {
  const [orders, setOrders] = useState<PurchaseOrderWithDetails[]>(initialData.data);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrderWithDetails | null>(null);
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>(DocumentStatus.OPEN);
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(initialData.pagination.page);
  const [totalPages, setTotalPages] = useState(initialData.pagination.totalPages);

  useEffect(() => {
    loadData();
  }, [currentPage, statusFilter, supplierFilter, debouncedSearchTerm]);

  const loadData = async () => {
    setLoading(true);
    try {
      const filters: PurchaseOrderFilters = { businessUnitId };
      if (statusFilter !== "all") filters.status = statusFilter;
      if (supplierFilter !== "all") filters.bpCode = supplierFilter; // Filter by bpCode
      if (debouncedSearchTerm) filters.searchTerm = debouncedSearchTerm;

      const result = await getPurchaseOrders(filters, { page: currentPage, limit: 10 });
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
    const statusMap: Record<DocumentStatus, StatusConfig> = {
      [DocumentStatus.OPEN]: { variant: "secondary", label: "Open" },
      [DocumentStatus.CLOSED]: { variant: "default", className: "bg-green-600 hover:bg-green-700", label: "Closed" },
      [DocumentStatus.CANCELLED]: { variant: "destructive", label: "Cancelled" },
    };
    const config = statusMap[status] || { variant: "outline", label: "Unknown" };
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Purchase Orders</h1>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by PO#, PR#, or Supplier..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilterValue)}>
                <SelectTrigger className="w-full md:w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.values(DocumentStatus).map(status => (
                    <SelectItem key={status} value={status}>{status.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={supplierFilter} onValueChange={(value) => setSupplierFilter(value)}>
                <SelectTrigger className="w-full md:w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {suppliers.map((s) => <SelectItem key={s.bpCode} value={s.bpCode}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
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
                    <TableHead>PR Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="h-32 text-center">Loading...</TableCell></TableRow>
                  ) : orders.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No purchase orders found.</TableCell></TableRow>
                  ) : (
                    orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.poNumber}</TableCell>
                        <TableCell>{order.purchaseRequest.prNumber}</TableCell>
                        <TableCell>{order.businessPartner.name}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell>{format(new Date(order.createdAt), "MMM dd, yyyy")}</TableCell>
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
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <span className="text-sm font-medium">Page {currentPage} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <Dialog open={!!selectedOrder} onOpenChange={(isOpen) => !isOpen && setSelectedOrder(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Purchase Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <PurchaseOrderDetails
              initialOrder={selectedOrder}
              currentUserId={currentUserId}
              userRole={userRole}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
