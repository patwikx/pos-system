"use client";

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { FileText, Plus } from 'lucide-react';
import { format } from 'date-fns';
import type { PurchaseRequestWithDetails } from '@/types/pr-po-types';
import { cn } from '@/lib/utils';

interface PurchaseRequestSidebarProps {
  availablePRs: PurchaseRequestWithDetails[];
  businessUnitId: string;
}

export function PurchaseRequestSidebar({ availablePRs, businessUnitId }: PurchaseRequestSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleSelectPR = (prId: string) => {
    router.push(`/${businessUnitId}/purchase-orders/new-from-pr-${prId}`);
  };

  const handleNewPO = () => {
    router.push(`/${businessUnitId}/purchase-request/new`);
  };

  const isActive = (prId: string) => {
    return pathname.includes(`new-from-pr-${prId}`);
  };

  return (
    <Card className="h-max-screen w-[400px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileText size={20} />
            Purchase Requests
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewPO}
            title="Create new blank Purchase Order"
          >
            <Plus size={16} />
          </Button>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Select a PR to create a PO
        </p>
      </CardHeader>
      <Separator />
      <CardContent className="flex-1 p-0">
        {availablePRs.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            No approved PRs available for PO creation.
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-250px)]"> {/* Adjust height as needed */}
            <div className="p-2">
              {availablePRs.map((pr) => (
                <Button
                  key={pr.id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start h-auto py-2 px-3 mb-1 text-left",
                    isActive(pr.id) && "bg-muted hover:bg-muted"
                  )}
                  onClick={() => handleSelectPR(pr.id)}
                >
                  <div>
                    <div className="font-medium">{pr.prNumber}</div>
                    <div className="text-xs text-muted-foreground">
                      {pr.requestor.name} - {format(pr.createdAt, 'MMM dd, yyyy')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {pr.items.length} item(s)
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
