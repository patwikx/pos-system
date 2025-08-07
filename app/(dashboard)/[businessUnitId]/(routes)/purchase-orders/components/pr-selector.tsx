"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, FileText, User, Calendar, Package } from 'lucide-react';
import { format } from 'date-fns';
import type {
  PurchaseRequestWithDetails,
  BusinessPartnerOption,
  UserOption,
  InventoryItemOption,
  GlAccountOption
} from '@/types/pr-po-types';
import { PurchaseOrderForm } from './po-form';

interface PurchaseRequestSelectorProps {
  availablePRs: PurchaseRequestWithDetails[];
  businessUnitId: string;
  currentUserId: string;
  userRole: string;
  vendors: BusinessPartnerOption[];
  users: UserOption[];
  inventoryItems: InventoryItemOption[];
  expenseAccounts: GlAccountOption[];
}

export function PurchaseRequestSelector({
  availablePRs,
  businessUnitId,
  currentUserId,
  userRole,
  vendors,
  users,
  inventoryItems,
  expenseAccounts
}: PurchaseRequestSelectorProps) {
  const router = useRouter();
  const [selectedPR, setSelectedPR] = useState<PurchaseRequestWithDetails | null>(null);

  if (selectedPR) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setSelectedPR(null)}
            className="gap-2"
          >
            <ArrowLeft size={16} />
            Back to Selection
          </Button>
          <div>
            <h2 className="text-xl font-semibold">
              Creating PO from PR: {selectedPR.prNumber}
            </h2>
            <p className="text-muted-foreground">
              Requested by {selectedPR.requestor.name} on {format(selectedPR.createdAt, 'PPP')}
            </p>
          </div>
        </div>

        <PurchaseOrderForm
          initialOrder={null}
          orderIds={[]}
          businessUnitId={businessUnitId}
          currentUserId={currentUserId}
          userRole={userRole}
          vendors={vendors}
          users={users}
          inventoryItems={inventoryItems}
          expenseAccounts={expenseAccounts}
          selectedPurchaseRequest={selectedPR}
        />
      </div>
    );
  }

  if (availablePRs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText size={48} className="text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Available Purchase Requests</h3>
          <p className="text-muted-foreground text-center mb-4">
            There are no approved purchase requests available to convert to purchase orders.
          </p>
          <Button
            variant="outline"
            onClick={() => router.push(`/${businessUnitId}/purchase-requests/new`)}
          >
            Create Purchase Request
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package size={20} />
          Available Purchase Requests
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PR Number</TableHead>
              <TableHead>Requestor</TableHead>
              <TableHead>Created Date</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {availablePRs.map((pr) => (
              <TableRow key={pr.id}>
                <TableCell className="font-medium">{pr.prNumber}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-muted-foreground" />
                    {pr.requestor.name}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-muted-foreground" />
                    {format(pr.createdAt, 'MMM dd, yyyy')}
                  </div>
                </TableCell>
                <TableCell>{pr.items.length} item(s)</TableCell>
                <TableCell>
                  <Badge variant="default">Approved</Badge>
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    onClick={() => setSelectedPR(pr)}
                  >
                    Select
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
