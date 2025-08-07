"use client";

import React, { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, DollarSign, Truck } from 'lucide-react';
import { format } from 'date-fns';
import type { PurchaseOrderWithDetails } from '@/types/pr-po-types';
import { DocumentStatus } from '@prisma/client';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';

interface PurchaseOrderDetailsProps {
  initialOrder: PurchaseOrderWithDetails;
  currentUserId: string;
  userRole?: string;
}

type StatusConfig = {
    variant: ComponentProps<typeof Badge>["variant"];
    label: string;
    className?: string;
};

const DetailItem = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value || '-'}</p>
    </div>
);

export function PurchaseOrderDetails({ initialOrder, currentUserId, userRole }: PurchaseOrderDetailsProps) {
  const order = initialOrder;

  const getStatusBadge = (status: DocumentStatus) => {
    const statusMap: Record<DocumentStatus, StatusConfig> = {
      [DocumentStatus.OPEN]: { variant: "secondary", label: "Open" },
      [DocumentStatus.CLOSED]: { variant: "default", className: "bg-green-600 hover:bg-green-700", label: "Closed" },
      [DocumentStatus.CANCELLED]: { variant: "destructive", label: "Cancelled" },
    };
    const config = statusMap[status] || { variant: "outline", label: "Unknown" };
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  if (!order) return <div>Purchase order not found.</div>;

  const canReceive = order.status === DocumentStatus.OPEN;

  const calculateTotal = () => {
      return order.items.reduce((sum, item) => sum + (item.lineTotal), 0);
  }

  return (
    <Card>
        <CardHeader className="bg-slate-50/50">
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-2xl font-bold">{order.poNumber}</h2>
                    <p className="text-muted-foreground">
                        Created on {format(new Date(order.createdAt), 'PPP')}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    {getStatusBadge(order.status)}
                    {canReceive && (
                        <Button>
                            <Truck className="mr-2 h-4 w-4" />
                            Receive Items
                        </Button>
                    )}
                </div>
            </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
            {/* --- HEADER DETAILS --- */}
            <div className="p-4 border rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4">
                    <DetailItem label="Supplier" value={order.businessPartner.name} />
                    <DetailItem label="Owner" value={order.owner.name} />
                    <DetailItem label="Posting Date" value={format(new Date(order.postingDate), 'PP')} />
                    <DetailItem label="Delivery Date" value={format(new Date(order.deliveryDate), 'PP')} />
                </div>
            </div>

            {/* --- ITEMS TABLE --- */}
            <div>
                <h3 className="text-lg font-semibold mb-2">Contents</h3>
                <div className="border rounded-md">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead className="w-[40px]">#</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>G/L Account / Item</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {order.items.map((item, index) => (
                        <TableRow key={item.id}>
                        <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="font-medium">{item.description}</TableCell>
                        <TableCell className="text-muted-foreground">
                            {item.glAccount?.name || item.inventoryItem?.name || 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">₱{item.unitPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-semibold">₱{item.lineTotal.toFixed(2)}</TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                </div>
            </div>
        </CardContent>
        <CardFooter className="bg-slate-50/50 p-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                <div className="space-y-2">
                    <Label htmlFor="remarks">Remarks</Label>
                    <Textarea id="remarks" value={order.remarks || ''} readOnly rows={4} className="bg-white"/>
                </div>
                <div className="space-y-2 text-right">
                    <div className="flex justify-end items-center gap-4">
                        <span className="text-muted-foreground">Total Before Discount</span>
                        <span className="font-semibold w-36">₱{order.totalAmount.toFixed(2)}</span>
                    </div>
                     <div className="flex justify-end items-center gap-4">
                        <span className="text-muted-foreground">Tax</span>
                        <span className="font-semibold w-36">₱0.00</span>
                    </div>
                    <Separator className="my-2"/>
                    <div className="flex justify-end items-center gap-4 text-lg">
                        <span className="font-bold">Total Payment Due</span>
                        <span className="font-bold w-36">₱{order.totalAmount.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </CardFooter>
    </Card>
  );
}
