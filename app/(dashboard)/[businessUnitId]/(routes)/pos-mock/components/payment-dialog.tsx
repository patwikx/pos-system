"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Order, PaymentMethod } from '@/types/pos-types';
import { paymentMethods } from '@/lib/mock-data';
import { CreditCard, Banknote, Smartphone, Building2, Check, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  order: Order;
  onPaymentComplete: () => void;
}

const paymentIcons = {
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
};

export function PaymentDialog({ open, onClose, order, onPaymentComplete }: PaymentDialogProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(paymentMethods[0] || null);
  const [amount, setAmount] = useState(order.totalAmount.toString());
  const [notes, setNotes] = useState('');

  const change = parseFloat(amount || '0') - order.totalAmount;
  const canPay = parseFloat(amount || '0') >= order.totalAmount;

  const handlePayment = () => {
    if (!canPay) return;
    console.log('Processing payment...');
    onPaymentComplete();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Process Payment</DialogTitle>
        </DialogHeader>

        {/* --- Payment Summary --- */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span>${order.subTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tax</span>
            <span>${order.tax.toFixed(2)}</span>
          </div>
          {order.discountValue > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span>-${order.discountValue.toFixed(2)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-bold text-lg">
            <span>Total Due</span>
            <span className="text-blue-600">${order.totalAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* --- Payment Method --- */}
        <div>
          <Label className="font-semibold">Payment Method</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
            {paymentMethods.filter(m => m.isActive).map(method => {
              const Icon = paymentIcons
              return (
                <div
                  key={method.id}
                  onClick={() => setSelectedMethod(method)}
                  className={cn(
                    'p-3 border rounded-lg cursor-pointer flex items-center gap-2 transition-all',
                    selectedMethod?.id === method.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'hover:bg-gray-50'
                  )}
                >
                  <paymentIcons.Banknote className="h-5 w-5 text-gray-700" />
                  <span className="font-medium text-sm">{method.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* --- Amount --- */}
        <div>
          <Label htmlFor="amount" className="font-semibold">Amount Received</Label>
          <Input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-12 text-lg font-bold mt-1"
            placeholder="0.00"
          />
          {selectedMethod?.type === 'cash' && change >= 0 && (
            <div className="flex justify-between text-green-600 font-medium mt-2 text-sm">
              <span>Change:</span>
              <span>${change.toFixed(2)}</span>
            </div>
          )}
        </div>
        
        {/* --- Notes --- */}
        <div>
          <Label htmlFor="notes" className="font-semibold">Notes (Optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any payment notes here..."
            className="mt-1"
            rows={2}
          />
        </div>

        <DialogFooter>
          <Button
            onClick={handlePayment}
            disabled={!canPay || !selectedMethod}
            className="w-full h-12 text-base font-bold"
          >
            Complete Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}