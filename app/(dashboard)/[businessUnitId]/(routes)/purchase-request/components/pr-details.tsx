"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea'; // Keep if needed for other textareas
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Check, X, User, ShoppingBag } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { PurchaseRequestStatus } from '@prisma/client';
import {
  getPurchaseRequestById,
  approvePurchaseRequest,
  getVendors, // Changed from getSuppliers
  getInventoryItems,
  getExpenseAccounts,
  getUoMs,
} from '@/lib/actions/pr-po-actions';
import type {
  PurchaseRequestWithDetails,
  BusinessPartnerOption, // Changed from SupplierOption
  InventoryItemOption,
  GlAccountOption,
  UoMOption,
} from '@/types/pr-po-types';
import { CreatePurchaseOrderDialog } from './create-pr-dialog';

interface PurchaseRequestDetailsProps {
  requestId: string;
  currentUserId: string;
  userRole?: string;
  onUpdate?: () => void;
}

export function PurchaseRequestDetails({
  requestId,
  currentUserId,
  userRole,
  onUpdate
}: PurchaseRequestDetailsProps) {
  const [request, setRequest] = useState<PurchaseRequestWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  // Removed rejectionReason state as it's not in schema
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  
  // State to hold data for the Create PO Dialog
  const [vendors, setVendors] = useState<BusinessPartnerOption[]>([]); // Changed from suppliers
  const [inventoryItems, setInventoryItems] = useState<InventoryItemOption[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<GlAccountOption[]>([]);
  const [uoms, setUoms] = useState<UoMOption[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch the main request details
        const requestData = await getPurchaseRequestById(requestId);
        setRequest(requestData);
        // If the request exists and is approved, pre-fetch data for the PO dialog
        if (requestData && requestData.status === 'APPROVED') {
          const [vendorData, inventoryData, accountData, uomData] = await Promise.all([
            getVendors(requestData.businessUnitId), // Pass businessUnitId
            getInventoryItems(requestData.businessUnitId),
            getExpenseAccounts(requestData.businessUnitId),
            getUoMs()
          ]);
          setVendors(vendorData); // Set vendors
          setInventoryItems(inventoryData);
          setExpenseAccounts(accountData);
          setUoms(uomData);
        }
      } catch (error) {
        console.error('Error loading request details:', error);
        toast.error('Failed to load purchase request details');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [requestId]);

  const handleApprovalSuccess = () => {
    // After approving, we need to refetch everything, including the PO dialog data
    const loadData = async () => {
      const requestData = await getPurchaseRequestById(requestId);
      setRequest(requestData);
      if (requestData && requestData.status === 'APPROVED') {
        const [vendorData, inventoryData, accountData, uomData] = await Promise.all([
          getVendors(requestData.businessUnitId), // Pass businessUnitId
          getInventoryItems(requestData.businessUnitId),
          getExpenseAccounts(requestData.businessUnitId),
          getUoMs()
        ]);
        setVendors(vendorData); // Set vendors
        setInventoryItems(inventoryData);
        setExpenseAccounts(accountData);
        setUoms(uomData);
      }
      onUpdate?.();
    };
    loadData();
  }

  const handleApprove = async () => {
    if (!request) return;
    setIsApproving(true);
    try {
      const result = await approvePurchaseRequest({ id: request.id, approved: true }, currentUserId);
      if (result.success) {
        toast.success(result.message);
        handleApprovalSuccess();
      } else {
        toast.error(result.error || 'Failed to approve request');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!request) return;
    setIsRejecting(true);
    try {
      // Removed rejectionReason from data as it's not in schema
      const result = await approvePurchaseRequest({ id: request.id, approved: false }, currentUserId);
      if (result.success) {
        toast.success(result.message);
        setRequest(result.data as PurchaseRequestWithDetails); // Update local state immediately
        onUpdate?.();
      } else {
        toast.error(result.error || 'Failed to reject request');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsRejecting(false);
      // Removed setRejectionReason('')
    }
  };

  const getStatusBadge = (status: PurchaseRequestStatus) => {
    const statusConfig = {
      PENDING: { variant: 'secondary' as const, label: 'Pending' },
      APPROVED: { variant: 'default' as const, label: 'Approved' },
      REJECTED: { variant: 'destructive' as const, label: 'Rejected' },
    };
    const config = statusConfig[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const canApprove = userRole === 'admin' && request?.status === 'PENDING';
  const canCreatePO = request?.status === 'APPROVED' && !request?.purchaseOrder;

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  if (!request) {
    return <div className="flex justify-center p-8 text-muted-foreground">Request not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold">{request.prNumber}</h2>
            {getStatusBadge(request.status)}
          </div>
          <p className="text-muted-foreground">
            Created {format(new Date(request.createdAt), 'PPP')}
          </p>
        </div>
        <div className="flex gap-2">
          {canApprove && (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700">
                    <Check className="h-4 w-4 mr-2" />Approve
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Approve Purchase Request?</AlertDialogTitle>
                    <AlertDialogDescription>This will allow it to be converted to a purchase order.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleApprove} disabled={isApproving}>
                      {isApproving ? 'Approving...' : 'Confirm Approve'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700">
                    <X className="h-4 w-4 mr-2" />Reject
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reject Purchase Request</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to reject this purchase request? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  {/* Removed rejection reason input */}
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReject} disabled={isRejecting}>
                      {isRejecting ? 'Rejecting...' : 'Confirm Reject'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          {canCreatePO && (
            <CreatePurchaseOrderDialog
              purchaseRequest={request}
              onSuccess={() => {
                const loadData = async () => {
                  const requestData = await getPurchaseRequestById(requestId);
                  setRequest(requestData);
                  onUpdate?.();
                }
                loadData();
              }}
              // Pass all the required data down to the dialog
              vendors={vendors} // Changed from suppliers
              inventoryItems={inventoryItems}
              expenseAccounts={expenseAccounts}
              uoms={uoms}
            />
          )}
        </div>
      </div>

      {/* Request Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><User className="h-5 w-5" />Requestor Info</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Requestor</Label>
              <p>{request.requestor.name || request.requestor.name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Business Unit</Label>
              <p>{request.businessUnit.name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Created</Label>
              <p>{format(new Date(request.createdAt), 'PPP p')}</p>
            </div>
            {request.notes && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Notes</Label>
                <p className="text-sm whitespace-pre-wrap">{request.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Check className="h-5 w-5" />Approval Info</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Status</Label>
              <div className="mt-1">{getStatusBadge(request.status)}</div>
            </div>
            {request.approver ? (
              <>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">{request.status === 'REJECTED' ? 'Rejected By' : 'Approved By'}</Label>
                  <p>{request.approver.name || request.approver.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">{request.status === 'REJECTED' ? 'Rejection Date' : 'Approval Date'}</Label>
                  <p>{request.approvalDate ? format(new Date(request.approvalDate), 'PPP p') : '-'}</p>
                </div>
              </>
            ) : <p className="text-sm text-muted-foreground">Awaiting approval.</p>}
            {/* Removed request.rejectionReason display */}
            {request.purchaseOrder && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Purchase Order</Label>
                <p className="flex items-center gap-2 text-sm"><ShoppingBag className="h-4 w-4" />PO has been created.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Separator />
      <Card>
        <CardHeader><CardTitle className="text-lg">Requested Items ({request.items.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {request.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.description || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.requestedQuantity}
                  </TableCell>
                  <TableCell>
                    {item.uom?.symbol || 'N/A'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.notes || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
