"use client";

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Order, OrderItem, Discount, User, BusinessPartner, Table,
    MenuItem, Modifier, OrderStatus, Payment, Shift, PosTerminal,
    Invoice
} from "@prisma/client";
import { ShoppingCart, Trash2, Send, Receipt, ChefHat, Plus, Minus, User as UserIcon } from 'lucide-react';
import { PaymentDialog } from './payment-dialog';
import { cn, formatter } from '@/lib/utils';

export type OrderWithDetails = Order & {
    items: (OrderItem & {
        menuItem: MenuItem;
        modifiers: Modifier[];
        voidedByUser: User | null;
    })[];
    user: User | null;
    table: Table | null;
    discount: Discount | null;
    businessPartner: BusinessPartner | null;
    payments: Payment[];
    shift: (Shift & { user: User, terminal: PosTerminal }) | null;
    invoice: Invoice | null;
};

type SimpleUser = { id: string; name: string | null; };

interface OrderCartProps {
  currentOrder: OrderWithDetails | null;
  users: SimpleUser[];
  discounts: Discount[];
  businessPartners: BusinessPartner[];
  onUpdateOrder: (order: OrderWithDetails) => void;
  onSendToKitchen: (orderId: string) => void;
  onPaymentComplete: () => void;
  onAddItemsClick: () => void;
}

const statusConfig: Record<OrderStatus, { color: string; icon: React.ReactNode }> = {
  OPEN: { color: 'bg-gray-100 text-gray-800', icon: '📝' },
  PREPARING: { color: 'bg-orange-100 text-orange-800', icon: <ChefHat className="h-4 w-4" /> },
  SERVED: { color: 'bg-blue-100 text-blue-800', icon: <UserIcon className="h-4 w-4" /> },
  PAID: { color: 'bg-green-100 text-green-800', icon: <Receipt className="h-4 w-4" /> },
  CANCELLED: { color: 'bg-red-100 text-red-800', icon: '❌' },
};

export function OrderCart({
    currentOrder, users, discounts, businessPartners, onUpdateOrder, onSendToKitchen, onPaymentComplete
}: OrderCartProps) {
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

    useEffect(() => {
        // This effect can be removed if not used, or kept for future implementation.
    }, [currentOrder]);

    const recalculateTotals = (items: OrderWithDetails['items'], discount?: Discount | null): Partial<Order> => {
        const subTotal = items.reduce((sum, item) => {
            if (item.isVoided) return sum;
            return sum + (item.priceAtSale * item.quantity);
        }, 0);
        
        const tax = subTotal * 0.12; // Example: 12% tax
        
        let discountValue = 0;
        if (discount) {
            discountValue = discount.type === 'PERCENTAGE' ? subTotal * (discount.value / 100) : discount.value;
        }
        
        const totalAmount = subTotal + tax - discountValue;
        return { subTotal, tax, discountValue, totalAmount, updatedAt: new Date() };
    };

    const updateQuantity = (itemId: string, newQuantity: number) => {
        if (!currentOrder) return;
        
        const updatedItems = currentOrder.items
            .map(item => item.id === itemId ? { ...item, quantity: Math.max(0, newQuantity) } : item)
            .filter(item => item.quantity > 0);

        const newTotals = recalculateTotals(updatedItems, currentOrder.discount);
        onUpdateOrder({ ...currentOrder, items: updatedItems, ...newTotals });
    };

    const updateWaiter = (userId: string) => {
        if (!currentOrder) return;
        const user = users.find(u => u.id === userId);
        if (user) {
            onUpdateOrder({ ...currentOrder, userId: user.id, user: user as User, updatedAt: new Date() });
        }
    };

    // Correctly handles finding the discount or clearing it
    const updateDiscount = (value: string) => {
        if (!currentOrder) return;
        
        // If value is "none", discount will be undefined.
        const discount = discounts.find(d => d.id === value);
        
        const newTotals = recalculateTotals(currentOrder.items, discount);
        
        onUpdateOrder({ 
            ...currentOrder, 
            discountId: discount?.id || null, 
            discount: discount || null, 
            ...newTotals 
        });
    };

    if (!currentOrder) {
        return (
            <Card className="p-6 h-full flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-40" />
                    <h3 className="text-lg font-semibold">No Active Order</h3>
                    <p className="text-sm">Select a table to begin.</p>
                </div>
            </Card>
        );
    }
  
    const statusInfo = statusConfig[currentOrder.status];
    const isOrderEditable = currentOrder.status === 'OPEN';

    return (
        <>
            <Card className="p-4 h-full flex flex-col shadow-md">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-bold">Order #{currentOrder.id.slice(-6)}</h2>
                        <p className="text-sm text-muted-foreground">{currentOrder.table ? currentOrder.table.name : 'Take-Out'}</p>
                    </div>
                    <Badge className={cn('font-medium text-xs px-3 py-1.5 flex items-center gap-2', statusInfo.color)}>
                        {statusInfo.icon}
                        {currentOrder.status}
                    </Badge>
                </div>

                <ScrollArea className="flex-1 -mx-4">
                    <div className="px-4 space-y-2">
                        {currentOrder.items.map(item => (
                        <div key={item.id} className="border rounded-md p-3 bg-background">
                            <div className="flex justify-between items-start">
                                <h4 className="font-semibold text-sm flex-1 pr-2">{item.menuItem.name}</h4>
                                <span className="font-bold text-sm">{formatter.format(item.priceAtSale * item.quantity)}</span>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="icon" onClick={() => updateQuantity(item.id, item.quantity - 1)} disabled={!isOrderEditable} className="h-6 w-6"><Minus className="h-3 w-3" /></Button>
                                    <span className="w-6 text-center font-bold">{item.quantity}</span>
                                    <Button variant="outline" size="icon" onClick={() => updateQuantity(item.id, item.quantity + 1)} disabled={!isOrderEditable} className="h-6 w-6"><Plus className="h-3 w-3" /></Button>
                                </div>
                                {isOrderEditable && <Button variant="ghost" size="icon" onClick={() => updateQuantity(item.id, 0)} className="h-6 w-6 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>}
                            </div>
                        </div>
                        ))}
                    </div>
                </ScrollArea>

                <div className="border-t pt-4 mt-4 space-y-2">
                    {isOrderEditable && (
                        <div className="grid grid-cols-2 gap-2">
                            <Select value={currentOrder.userId || ''} onValueChange={updateWaiter}><SelectTrigger><SelectValue placeholder="Select Server" /></SelectTrigger><SelectContent>{users.map(user => (<SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>))}</SelectContent></Select>
                            
                            {/* FIX: Use `currentOrder.discountId || 'none'` for the value and a non-empty value for the "No Discount" item */}
                            <Select value={currentOrder.discountId || 'none'} onValueChange={updateDiscount}>
                                <SelectTrigger><SelectValue placeholder="Apply Discount" /></SelectTrigger>
                                <SelectContent>
                                    {/* FIX: Changed value from "" to "none" */}
                                    <SelectItem value="none">No Discount</SelectItem>
                                    {discounts.map(d => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <div className="flex justify-between text-sm"><span>Subtotal:</span><span className="font-medium">{formatter.format(currentOrder.subTotal)}</span></div>
                    <div className="flex justify-between text-sm"><span>Tax:</span><span className="font-medium">{formatter.format(currentOrder.tax)}</span></div>
                    {currentOrder.discountValue > 0 && <div className="flex justify-between text-sm text-primary"><span>Discount:</span><span className="font-medium">-{formatter.format(currentOrder.discountValue)}</span></div>}
                    <Separator />
                    <div className="flex justify-between font-bold text-lg"><span>Total:</span><span className="text-primary">{formatter.format(currentOrder.totalAmount)}</span></div>
                </div>

                <div className="mt-auto pt-4 space-y-2">
                    {currentOrder.status === 'OPEN' && <Button onClick={() => onSendToKitchen(currentOrder.id)} disabled={currentOrder.items.length === 0} className="w-full h-12"><Send className="h-4 w-4 mr-2" /> Send to Kitchen</Button>}
                    {(currentOrder.status === 'PREPARING' || currentOrder.status === 'SERVED') && <Button onClick={() => setPaymentDialogOpen(true)} className="w-full h-12"><Receipt className="h-4 w-4 mr-2" /> Process Payment</Button>}
                </div>
            </Card>

            <PaymentDialog
                open={paymentDialogOpen}
                onClose={() => setPaymentDialogOpen(false)}
                order={currentOrder}
                businessPartners={businessPartners}
                onPaymentComplete={onPaymentComplete}
            />
        </>
    );
}