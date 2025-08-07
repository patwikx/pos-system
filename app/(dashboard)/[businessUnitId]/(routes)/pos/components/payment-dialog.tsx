"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Order, BusinessPartner, Discount, PaymentMethod } from "@prisma/client"
import { CreditCard, Banknote, Smartphone, Building2 } from 'lucide-react';
import { cn, formatter } from '@/lib/utils';
import axios from 'axios';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import  prismadb  from '@/lib/db'; // Adjust import based on your setup

type OrderWithDetails = Order & { discount: Discount | null };

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  order: OrderWithDetails | null;
  businessPartners: BusinessPartner[];
  onPaymentComplete: () => void;
}

export function PaymentDialog({ open, onClose, order, businessPartners, onPaymentComplete }: PaymentDialogProps) {
  const params = useParams();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('');
  const [amountPaid, setAmountPaid] = useState('');
  const [splitPayments, setSplitPayments] = useState<Array<{ paymentMethodId: string; amount: number; name: string; }>>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(order?.businessPartnerId || null);

  useEffect(() => {
    // Fetch available payment methods when the dialog opens
    if (open) {
      const fetchPaymentMethods = async () => {
        // In a real app, this would be an API call
        // For now, we simulate it based on your seed data
        const methods = await prismadb.paymentMethod.findMany({ where: { isActive: true } });
        setPaymentMethods(methods);
      };
      // fetchPaymentMethods(); // Uncomment when you have an API route
    }
  }, [open]);

  useEffect(() => {
    if (order) {
      const remaining = order.totalAmount - splitPayments.reduce((sum, p) => sum + p.amount, 0);
      setAmountPaid(remaining.toFixed(2));
      setSelectedPartnerId(order.businessPartnerId);
    }
  }, [order, open, splitPayments]);

  if (!order) return null;

  const remainingAmount = order.totalAmount - splitPayments.reduce((sum, p) => sum + p.amount, 0);
  const isFullyPaidBySplits = remainingAmount <= 0.001;

  const handlePayment = async () => {
    try {
        const finalPayments = splitPayments.length > 0 
            ? splitPayments 
            : [{ paymentMethodId: selectedPaymentMethodId, amount: parseFloat(amountPaid), name: '' }];
        
        if (finalPayments.length === 0 || finalPayments.some(p => !p.paymentMethodId || p.amount <= 0)) {
            toast.error("Please select a payment method and enter a valid amount.");
            return;
        }

        await axios.post(`/api/${params.businessUnitId}/checkout`, {
            orderId: order.id,
            businessPartnerId: selectedPartnerId,
            payments: finalPayments.map(p => ({
                amount: p.amount,
                paymentMethodId: p.paymentMethodId,
            }))
        });

        toast.success("Payment successful!");
        onPaymentComplete();
        onClose();
    } catch (error) {
        toast.error("Payment failed. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Process Payment - Order #{order.id.slice(-6)}</DialogTitle></DialogHeader>
        {/* Payment logic and UI would go here, using the real paymentMethods from state */}
        <p>Total Due: {formatter.format(order.totalAmount)}</p>
        <Button onClick={handlePayment}>Finalize Payment</Button>
      </DialogContent>
    </Dialog>
  );
}