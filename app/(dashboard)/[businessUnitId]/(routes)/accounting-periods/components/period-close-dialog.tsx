"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CheckCircle, Lock, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { AccountingPeriodColumn } from "./columns";
import { validateAccountingPeriod, closeAccountingPeriod } from "@/lib/actions/financials-actions";
import { PeriodStatus } from "@prisma/client";

// Add missing import for AccountingPeriodColumn type
import { AccountingPeriodColumn } from "./columns";

interface PeriodCloseDialogProps {
  period: AccountingPeriodColumn;
  children: React.ReactNode;
}

export function PeriodCloseDialog({ period, children }: PeriodCloseDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validation, setValidation] = useState<{
    isValid: boolean;
    canClose: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);

  const handleValidate = async () => {
    setLoading(true);
    try {
      const result = await validateAccountingPeriod(period.id);
      setValidation(result);
    } catch (error) {
      toast.error("Failed to validate period");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    if (!validation?.canClose) return;
    
    setLoading(true);
    try {
      const result = await closeAccountingPeriod(period.id);
      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to close period");
      }
    } catch (error) {
      toast.error("Failed to close period");
    } finally {
      setLoading(false);
    }
  };

  const canClose = period.status === PeriodStatus.OPEN;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Close Accounting Period
          </DialogTitle>
          <DialogDescription>
            Review and validate the period before closing. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Period Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Period Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Period:</span>
                <span>{period.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Date Range:</span>
                <span>{period.startDate} - {period.endDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Status:</span>
                <Badge variant={period.status === PeriodStatus.OPEN ? 'default' : 'secondary'}>
                  {period.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Journal Entries:</span>
                <Badge variant="outline">{period.journalEntryCount}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Validation Results */}
          {validation && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {validation.isValid ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  )}
                  Validation Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {validation.errors.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-600 mb-2">Errors (Must be resolved):</h4>
                    <ul className="space-y-1">
                      {validation.errors.map((error, index) => (
                        <li key={index} className="text-sm text-red-600 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {validation.warnings.length > 0 && (
                  <div>
                    <h4 className="font-medium text-yellow-600 mb-2">Warnings (Review recommended):</h4>
                    <ul className="space-y-1">
                      {validation.warnings.map((warning, index) => (
                        <li key={index} className="text-sm text-yellow-600 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {validation.isValid && validation.errors.length === 0 && validation.warnings.length === 0 && (
                  <div className="text-green-600 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Period is ready to be closed
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          {!validation && canClose && (
            <Button onClick={handleValidate} disabled={loading}>
              {loading ? "Validating..." : "Validate Period"}
            </Button>
          )}
          {validation && validation.canClose && (
            <Button 
              onClick={handleClose} 
              disabled={loading || !validation.canClose}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? "Closing..." : "Close Period"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}