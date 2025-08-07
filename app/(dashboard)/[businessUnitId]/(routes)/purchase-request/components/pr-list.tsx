"use client";

import React, { useState, useEffect, ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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
import { PurchaseRequestStatus } from "@prisma/client";
import {
  getPurchaseRequests,
  getBusinessUnits,
} from "@/lib/actions/pr-po-actions";
import type {
  PurchaseRequestWithDetails,
  PurchaseRequestFilters,
  BusinessUnitOption,
  PaginatedResponse,
} from "@/types/pr-po-types";
import { PurchaseRequestDetails } from "./pr-details";
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

interface PurchaseRequestListProps {
  currentUserId: string;
  userRole?: string;
  businessUnitId: string;
}

type StatusFilterValue = PurchaseRequestStatus | "all";
type BusinessUnitFilterValue = string | "all";

export function PurchaseRequestList({
  currentUserId,
  userRole,
  businessUnitId,
}: PurchaseRequestListProps) {
  const [requests, setRequests] = useState<PurchaseRequestWithDetails[]>([]);
  const [businessUnits, setBusinessUnits] = useState<BusinessUnitOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequestWithDetails | null>(null);
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [businessUnitFilter, setBusinessUnitFilter] = useState<BusinessUnitFilterValue>(businessUnitId); // Default to current business unit

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (userRole === 'admin') {
        getBusinessUnits().then(setBusinessUnits).catch(error => {
            console.error("Error fetching business units:", error);
            toast.error("Failed to load business units.");
        });
    }
  }, [userRole]);

  useEffect(() => {
    loadData();
  }, [currentPage, statusFilter, businessUnitFilter, debouncedSearchTerm]);

  const loadData = async () => {
    setLoading(true);
    try {
      const filters: PurchaseRequestFilters = {};
      if (statusFilter !== "all") filters.status = statusFilter;

      if (userRole === 'admin') {
        if (businessUnitFilter !== "all") filters.businessUnitId = businessUnitFilter;
      } else {
        filters.businessUnitId = businessUnitId;
      }

      if (userRole !== "admin") filters.requestorId = currentUserId;
      if (debouncedSearchTerm) filters.searchTerm = debouncedSearchTerm;

      const result = await getPurchaseRequests(filters, {
        page: currentPage,
        limit: pageSize,
      });
      setRequests(result.data);
      setTotalPages(result.pagination.totalPages);
    } catch (error) {
      console.error("Error loading purchase requests:", error);
      toast.error("Failed to load purchase requests.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: PurchaseRequestStatus) => {
    const statusConfig = {
      PENDING: { variant: "secondary" as const, label: "Pending" },
      APPROVED: { variant: "default" as const, label: "Approved" },
      REJECTED: { variant: "destructive" as const, label: "Rejected" },
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
            <h1 className="text-2xl font-bold">Purchase Requests</h1>
            <Button onClick={() => router.push(`/${businessUnitId}/purchase-requests/new`)}>
                <Plus className="mr-2 h-4 w-4" /> New Request
            </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by PR#, requestor, or description..."
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
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
              {userRole === 'admin' && (
                <Select value={businessUnitFilter} onValueChange={(value) => setBusinessUnitFilter(value as BusinessUnitFilterValue)}>
                    <SelectTrigger className="w-full md:w-[200px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                    <SelectItem value="all">All Business Units</SelectItem>
                    {businessUnits.map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>)}
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
                    <TableHead>PR Number</TableHead>
                    <TableHead>Requestor</TableHead>
                    <TableHead>Business Unit</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Approver</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={8} className="h-32 text-center">Loading...</TableCell></TableRow>
                  ) : requests.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">No purchase requests found.</TableCell></TableRow>
                  ) : (
                    requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.prNumber}</TableCell>
                        <TableCell>{request.requestor.name || request.requestor.name}</TableCell> {/* Corrected here */}
                        <TableCell>{request.businessUnit.name}</TableCell>
                        <TableCell><Badge variant="outline">{request.items.length}</Badge></TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>{format(new Date(request.createdAt), "MMM dd, yyyy")}</TableCell>
                        <TableCell>{request.approver?.name || '-'}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedRequest(request)}>
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
      <Dialog open={!!selectedRequest} onOpenChange={(isOpen) => !isOpen && setSelectedRequest(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Purchase Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <PurchaseRequestDetails
              requestId={selectedRequest.id}
              currentUserId={currentUserId}
              userRole={userRole}
              onUpdate={() => {
                setSelectedRequest(null);
                loadData();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
