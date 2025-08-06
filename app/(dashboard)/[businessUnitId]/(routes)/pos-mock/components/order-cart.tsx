"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Order, Discount, User } from '@/types/pos-types';
import { discounts, mockUsers } from '@/lib/mock-data';
import { ShoppingCart, Trash2, Send, Receipt, User as UserIcon, Percent, Clock, ChefHat, Plus, Minus, Settings, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PaymentDialog } from './payment-dialog';

interface OrderCartProps {
  currentOrder: Order | null;
  onUpdateOrder: (order: Order) => void;
  onSendToKitchen: (orderId: string) => void;
  onGenerateBill: (paymentDetails: any) => void;
  onAddItemsClick: () => void; // <-- ADD THIS LINE
}

const statusConfig = {
    OPEN: { color: 'bg-gray-100 text-gray-800', icon: <FileText className="h-4 w-4" /> },
    PREPARING: { color: 'bg-orange-100 text-orange-800', icon: <ChefHat className="h-4 w-4" /> },
    SERVED: { color: 'bg-blue-100 text-blue-800', icon: <UserIcon className="h-4 w-4" /> },
    PAID: { color: 'bg-green-100 text-green-800', icon: <Receipt className="h-4 w-4" /> },
    CANCELLED: { color: 'bg-red-100 text-red-800', icon: '❌' },
};

export function OrderCart({ currentOrder, onUpdateOrder, onSendToKitchen, onGenerateBill }: OrderCartProps) {
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [customerNotes, setCustomerNotes] = useState('');

  useEffect(() => {
    setCustomerNotes(currentOrder?.specialInstructions || '');
  }, [currentOrder?.specialInstructions]);

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (!currentOrder) return;
    
    const updatedItems = currentOrder.items.map(item =>
      item.id === itemId ? { ...item, quantity: Math.max(0, newQuantity) } : item
    ).filter(item => item.quantity > 0);

    const subtotal = updatedItems.reduce((sum, item) => sum + (item.priceAtSale * item.quantity), 0);
    const tax = subtotal * 0.12; // 12% VAT
    const discountAmount = currentOrder.discountValue;
    const total = subtotal + tax - discountAmount;

    onUpdateOrder({
      ...currentOrder,
      items: updatedItems,
      subTotal: subtotal,
      tax,
      totalAmount: total,
      updatedAt: new Date(),
    });
  };

  const removeItem = (itemId: string) => updateQuantity(itemId, 0);

  const updateWaiter = (userId: string) => {
    if (!currentOrder) return;
    const user = mockUsers.find(u => u.id === userId);
    if (!user) return;
    onUpdateOrder({ ...currentOrder, userId: user.id, user: user, updatedAt: new Date() });
  };

  const updateDiscount = (discountId: string) => {
    if (!currentOrder) return;
    const discount = discounts.find(d => d.id === discountId);
    if (!discount) return;

    let discountAmount = discount.type === 'PERCENTAGE' 
        ? currentOrder.subTotal * (discount.value / 100) 
        : discount.value;

    if (discount.maxDiscountAmount && discountAmount > discount.maxDiscountAmount) {
      discountAmount = discount.maxDiscountAmount;
    }

    const total = currentOrder.subTotal + currentOrder.tax - discountAmount;
    onUpdateOrder({ ...currentOrder, discountValue: discountAmount, discountId: discount.id, discount: discount, totalAmount: total, updatedAt: new Date() });
  };

  const updateCustomerNotes = () => {
    if (!currentOrder || customerNotes === currentOrder.specialInstructions) return;
    onUpdateOrder({ ...currentOrder, specialInstructions: customerNotes, updatedAt: new Date() });
  };

  if (!currentOrder) {
    return (
      <Card className="p-8 !h-[665px] !max-w-none !max-h-none flex flex-col items-center">
        <div className="text-center text-gray-500">
          <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingCart className="h-10 w-10 opacity-50" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Active Order</h3>
          <p className="text-sm">Select a table to view or create an order</p>
        </div>
      </Card>
    );
  }
  
  const statusInfo = statusConfig[currentOrder.status];
  const isOrderEditable = currentOrder.status === 'OPEN';

  return (
    <>
      <div className="!h-[700px] !max-h-none flex flex-col bg-gray-50 shadow-lg relative">
        {/* Header */}
        <div className="p-4 border-b bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5 text-white" />
                </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Order #{currentOrder.id.slice(-4)}</h2>
                <p className="text-sm text-gray-500">{currentOrder.table ? currentOrder.table.name : 'Walk-in'}</p>
              </div>
            </div>
            <Badge className={cn('font-medium text-xs px-3 py-1.5 flex items-center gap-2', statusInfo.color)}>
              {statusInfo.icon}
              {currentOrder.status}
            </Badge>
          </div>
        </div>

        {/* Main Content with Accordion */}
        <div className="flex-1 overflow-y-auto p-4">
          <Accordion type="multiple" defaultValue={['items', 'billing']} className="w-full">
            
            {/* Order Items Section */}
            <AccordionItem value="items">
              <AccordionTrigger className="text-base font-semibold">Order Items ({currentOrder.items.length})</AccordionTrigger>
              <AccordionContent className="pt-2 space-y-3">
                  {currentOrder.items.map(item => (
 <div key={item.id} className="flex items-center gap-4 py-2 border-b">
  {/* Image */}
  <img
    src={item.menuItem.imageUrl || "/placeholder.svg"}
    alt={item.menuItem.name}
    className="w-16 h-16 rounded-md object-cover flex-shrink-0"
  />

  {/* Item Details */}
  <div className="flex-1 min-w-0">
    <h4 className="font-semibold text-gray-800 truncate">
      {item.menuItem.name}
    </h4>
    <p className="text-sm text-gray-500">
      ${item.priceAtSale.toFixed(2)}
    </p>
    {item.modifiers?.length > 0 && (
      <div className="text-xs text-blue-600 mt-1 truncate">
        {item.modifiers.map((m) => `+ ${m.name}`).join(", ")}
      </div>
    )}
  </div>

  {/* Quantity Controls */}
  <div className="flex items-center gap-2">
    {isOrderEditable && (
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7"
        onClick={() => updateQuantity(item.id, item.quantity - 1)}
      >
        <Minus className="h-4 w-4" />
      </Button>
    )}
    <span className="w-6 text-center font-bold text-base">
      {item.quantity}
    </span>
    {isOrderEditable && (
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7"
        onClick={() => updateQuantity(item.id, item.quantity + 1)}
      >
        <Plus className="h-4 w-4" />
      </Button>
    )}
  </div>

  {/* Subtotal */}
  <span className="font-bold w-16 text-right text-gray-800">
    ${(item.priceAtSale * item.quantity).toFixed(2)}
  </span>

  {/* Remove Button */}
  {isOrderEditable && (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-red-500 hover:bg-red-50 hover:text-red-600"
      onClick={() => removeItem(item.id)}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )}
</div>
                  ))}
              </AccordionContent>
            </AccordionItem>

           {/* Settings Section */}
<AccordionItem value="settings">
  <AccordionTrigger className="text-base font-semibold">
    Settings
  </AccordionTrigger>
  <AccordionContent className="space-y-4 pt-4">
    {/* Two-column layout for Waiter & Discount */}
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Waiter</Label>
        <Select
          value={currentOrder.userId}
          onValueChange={updateWaiter}
          disabled={!isOrderEditable}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select waiter" />
          </SelectTrigger>
          <SelectContent>
            {mockUsers
              .filter((u) => u.isActive)
              .map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Discount</Label>
        <Select
          onValueChange={updateDiscount}
          value={currentOrder.discountId || ""}
          disabled={!isOrderEditable}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Apply discount" />
          </SelectTrigger>
          <SelectContent>
            {discounts
              .filter((d) => d.isActive)
              .map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
    </div>

    {/* Customer Notes */}
    <div className="space-y-2">
      <Label className="text-sm font-medium">Customer Notes</Label>
      <Textarea
        placeholder="e.g., allergies, special requests..."
        value={customerNotes}
        onChange={(e) => setCustomerNotes(e.target.value)}
        onBlur={updateCustomerNotes}
        className="text-sm"
        rows={2}
        disabled={!isOrderEditable}
      />
    </div>
  </AccordionContent>
</AccordionItem>


            {/* Billing Section */}
            <AccordionItem value="billing">
              <AccordionTrigger className="text-base font-semibold">Billing Summary</AccordionTrigger>
              <AccordionContent className="pt-2">
                 <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Subtotal</span><span className="font-medium">${currentOrder.subTotal.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Tax (12%)</span><span className="font-medium">${currentOrder.tax.toFixed(2)}</span></div>
                    {currentOrder.discountValue > 0 && (
                      <div className="flex justify-between text-green-600"><span>Discount</span><span className="font-medium">-${currentOrder.discountValue.toFixed(2)}</span></div>
                    )}
                    <Separator className="my-2"/>
                    <div className="flex justify-between font-bold text-lg text-gray-800"><span>Total</span><span className="text-green-600">${currentOrder.totalAmount.toFixed(2)}</span></div>
                  </div>
              </AccordionContent>
            </AccordionItem>

          </Accordion>
        </div>
        
        {/* Sticky Footer for Actions */}
        <div className="p-4 border-t bg-white/80 backdrop-blur-sm sticky bottom-0">
          {currentOrder.status === 'OPEN' && currentOrder.items.length > 0 && (
            <Button onClick={() => onSendToKitchen(currentOrder.id)} className="w-full h-12 text-base font-bold bg-orange-500 hover:bg-orange-600" size="lg">
              <Send className="h-5 w-5 mr-2" />
              Send to Kitchen
            </Button>
          )}
          {currentOrder.status === 'OPEN' && currentOrder.items.length === 0 && (
            <div className="text-center text-gray-500 py-4">
              <p className="text-sm">Add items to the order to continue</p>
            </div>
          )}
          {(currentOrder.status === 'PREPARING' || currentOrder.status === 'SERVED') && (
            <Button onClick={() => setPaymentDialogOpen(true)} className="w-full h-12 text-base font-bold bg-blue-600 hover:bg-blue-700" size="lg">
              <Receipt className="h-5 w-5 mr-2" />
              Process Payment
            </Button>
          )}
        </div>
      </div>
      
      <PaymentDialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        order={currentOrder}
        onPaymentComplete={() => {
          setPaymentDialogOpen(false);
          onGenerateBill(currentOrder.id);
        }}
      />
    </>
  );
}