"use client";

import { useState, useMemo, useEffect, Fragment } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

// 1. Import types directly from Prisma Client
import { Table, MenuItem, OrderItem, Modifier, MenuCategory, ModifierGroup } from "@prisma/client";
import { Plus, Minus, ShoppingCart, Search, Edit, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatter } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid'; // For generating temporary client-side IDs

// This is a client-side representation of an item being added to the order
// It's a subset of the full Prisma OrderItem
export type NewOrderItem = Omit<OrderItem, 'id' | 'orderId' | 'voidedAt' | 'voidedByUserId' | 'voidReason' | 'voidedByUser'> & {
    menuItem: MenuItem;
    modifiers: Modifier[];
};

// Define the detailed type for the menu items prop
type FullMenuItem = MenuItem & { 
    category: MenuCategory; 
    modifierGroups: (ModifierGroup & { modifiers: Modifier[] })[] 
};

interface MenuDialogProps {
  open: boolean;
  onClose: () => void;
  table: Table | null;
  onAddToOrder: (tableId: string, items: NewOrderItem[]) => void;
  // 2. Component now receives live data as props
  menuItems: FullMenuItem[];
  categories: MenuCategory[];
}

// Client-side cart item state
interface CartItem {
  id: string; // Temporary client-side UUID
  menuItem: FullMenuItem;
  quantity: number;
  specialInstructions: string;
  selectedModifiers: { [groupId: string]: string[] }; // Map of groupId to array of modifierIds
}

export function MenuDialog({ open, onClose, table, onAddToOrder, menuItems, categories }: MenuDialogProps) {
  const [cart, setCart] = useState<{ [key: string]: CartItem }>({});
  const [configuringItem, setConfiguringItem] = useState<CartItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      setCart({});
      setConfiguringItem(null);
      setSearchTerm('');
      setSelectedCategory('All');
    }
  }, [open]);

  const categoryNames = useMemo(() => ['All', ...categories.map(cat => cat.name)], [categories]);

  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || item.category.name === selectedCategory;
      return matchesSearch && matchesCategory && item.isActive;
    });
  }, [searchTerm, selectedCategory, menuItems]);

  const handleSelectItem = (item: FullMenuItem) => {
    setConfiguringItem({
      id: uuidv4(),
      menuItem: item,
      quantity: 1,
      specialInstructions: '',
      selectedModifiers: {}
    });
  };

  const handleAddToCart = () => {
    if (!configuringItem) return;
    setCart(prev => ({ ...prev, [configuringItem.id]: configuringItem }));
    setConfiguringItem(null);
  };

  const updateConfiguringItem = (updates: Partial<CartItem>) => {
    setConfiguringItem(prev => prev ? { ...prev, ...updates } : null);
  };

  const updateModifierSelection = (groupId: string, modifierId: string, isSelected: boolean) => {
    if (!configuringItem) return;
    const currentSelections = configuringItem.selectedModifiers[groupId] || [];
    let newSelections: string[];

    // All modifier groups are treated as multi-select (checkbox behavior)
    if (isSelected) {
      newSelections = [...currentSelections, modifierId];
    } else {
      newSelections = currentSelections.filter(id => id !== modifierId);
    }
    updateConfiguringItem({
      selectedModifiers: { ...configuringItem.selectedModifiers, [groupId]: newSelections }
    });
  };
  
  const calculateItemPrice = (item: CartItem): number => {
    let price = item.menuItem.price;
    for (const groupId in item.selectedModifiers) {
      const group = item.menuItem.modifierGroups?.find(g => g.id === groupId);
      item.selectedModifiers[groupId].forEach(modifierId => {
        const modifier = group?.modifiers.find(m => m.id === modifierId);
        if (modifier) price += modifier.priceChange;
      });
    }
    return price;
  };

  const handleFinalAddToOrder = () => {
    if (!table) return;
    const orderItems: NewOrderItem[] = Object.values(cart).map(cartItem => {
      const allModifiers: Modifier[] = [];
       Object.entries(cartItem.selectedModifiers).forEach(([groupId, modifierIds]) => {
          const group = cartItem.menuItem.modifierGroups?.find(g => g.id === groupId);
          modifierIds.forEach(modifierId => {
            const modifier = group?.modifiers.find(m => m.id === modifierId);
            if (modifier) allModifiers.push(modifier);
          });
       });

      return {
        menuItemId: cartItem.menuItem.id,
        menuItem: cartItem.menuItem,
        quantity: cartItem.quantity,
        priceAtSale: calculateItemPrice(cartItem),
        notes: cartItem.specialInstructions,
        kdsStatus: 'PENDING',
        isVoided: false,
        modifiers: allModifiers,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });
    onAddToOrder(table.id, orderItems);
    onClose();
  };

  const totalItems = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = Object.values(cart).reduce((sum, item) => sum + (calculateItemPrice(item) * item.quantity), 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
  <DialogContent className="!w-[1280px] !h-[830px] !max-w-none !max-h-none flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-xl font-semibold">
            Menu - Add Items to {table ? table.name : 'Walk-in'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 p-4 flex-1 overflow-hidden">
          {/* Menu Section */}
          <div className="flex-[3] flex flex-col min-w-0">
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="flex-1 flex flex-col min-h-0 border rounded-lg">
              <div className="p-3 border-b bg-secondary/50 rounded-t-lg">
                <div className="relative flex-1">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Search menu items..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
                </div>
                <TabsList className="grid w-full grid-cols-6 mt-3">
                  {categoryNames.map(category => (
                    <TabsTrigger key={category} value={category}>{category}</TabsTrigger>
                  ))}
                </TabsList>
              </div>
              <ScrollArea className="p-3 flex-1">
                <div className="grid grid-cols-4 gap-3">
                  {filteredItems.map(item => (
                    <Card key={item.id} className="p-3 flex flex-col justify-between hover:border-primary hover:shadow-sm transition-all">
                       <div>
                         <h4 className="font-semibold text-sm leading-tight">{item.name}</h4>
                         <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                       </div>
                       <div className="mt-3 flex items-center justify-between">
                         <span className="font-bold text-base">{formatter.format(item.price)}</span>
                         <Button onClick={() => handleSelectItem(item)} size="sm">Add</Button>
                       </div>
                     </Card>
                  ))}
                </div>
              </ScrollArea>
            </Tabs>
          </div>

          {/* Order Summary */}
          <div className="flex-[2] flex flex-col">
            <Card className="p-4 flex-1 flex flex-col">
              <h3 className="font-semibold text-lg mb-3">Items to Add</h3>
              {totalItems > 0 ? (
                 <>
                   <ScrollArea className="space-y-3 mb-4 flex-1 -mr-4 pr-4">
                     {Object.values(cart).map(cartItem => (
                       <div key={cartItem.id} className="border rounded-md p-3 bg-background">
                         <div className="flex justify-between items-start">
                           <div className="flex-1 pr-2">
                             <h4 className="font-medium text-sm">{cartItem.menuItem.name}</h4>
                             <p className="text-xs text-muted-foreground">{`${cartItem.quantity} × ${formatter.format(calculateItemPrice(cartItem))}`}</p>
                           </div>
                           <span className="font-semibold text-sm">{formatter.format(calculateItemPrice(cartItem) * cartItem.quantity)}</span>
                         </div>
                         <div className="flex items-center justify-end gap-2 border-t mt-2 pt-2">
                           <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => { const {[cartItem.id]: removed, ...rest} = cart; setCart(rest); setConfiguringItem(cartItem); }}>
                             <Edit className="h-3 w-3" />
                           </Button>
                           <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-red-50 hover:text-destructive" onClick={() => { const {[cartItem.id]: removed, ...rest} = cart; setCart(rest); }}>
                             <Trash2 className="h-4 w-4" />
                           </Button>
                         </div>
                       </div>
                     ))}
                   </ScrollArea>
                   <div className="border-t pt-3 mt-auto">
                     <div className="flex justify-between font-semibold"><p>Subtotal for these items</p><p>{formatter.format(totalPrice)}</p></div>
                     <Button onClick={handleFinalAddToOrder} className="w-full mt-3 h-12 text-base font-bold">
                       Add {totalItems} Item(s) to Order
                     </Button>
                   </div>
                 </>
              ) : (
                <div className="text-center text-muted-foreground flex flex-col items-center justify-center h-full">
                  <ShoppingCart className="h-10 w-10 mb-3 opacity-40" />
                  <p className="font-medium">Your cart is empty</p>
                  <p className="text-sm">Select items from the menu to get started.</p>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Item Customization Dialog */}
        <Dialog open={!!configuringItem} onOpenChange={(isOpen) => !isOpen && setConfiguringItem(null)}>
          {configuringItem && (
            <DialogContent>
              <DialogHeader><DialogTitle>{configuringItem.menuItem.name}</DialogTitle><DialogDescription>{configuringItem.menuItem.description}</DialogDescription></DialogHeader>
              <div className="py-2 space-y-4 max-h-[60vh] overflow-y-auto pr-3">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">Quantity</Label>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateConfiguringItem({ quantity: Math.max(1, configuringItem.quantity - 1) })}><Minus className="h-4 w-4" /></Button>
                    <span className="w-10 text-center font-bold text-lg">{configuringItem.quantity}</span>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateConfiguringItem({ quantity: configuringItem.quantity + 1 })}><Plus className="h-4 w-4" /></Button>
                  </div>
                </div>
                {configuringItem.menuItem.modifierGroups?.map(group => (
                  <div key={group.id} className="border-t pt-3">
                    <Label className="font-semibold">{group.name}</Label>
                    <div className="space-y-1 mt-2">
                      {group.modifiers.map(modifier => (
                        <Label key={modifier.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-secondary cursor-pointer">
                          <Checkbox id={`${group.id}-${modifier.id}`} checked={configuringItem.selectedModifiers[group.id]?.includes(modifier.id) || false} onCheckedChange={(checked) => updateModifierSelection(group.id, modifier.id, !!checked)} />
                          <span className="flex-1">{modifier.name}</span>
                          {modifier.priceChange > 0 && <span className="text-primary font-medium">+{formatter.format(modifier.priceChange)}</span>}
                        </Label>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="border-t pt-3">
                  <Label htmlFor="instructions" className="font-semibold">Special Instructions (Optional)</Label>
                  <Textarea id="instructions" placeholder="e.g., extra spicy, no onions..." value={configuringItem.specialInstructions} onChange={(e) => updateConfiguringItem({ specialInstructions: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setConfiguringItem(null)}>Cancel</Button>
                <Button onClick={handleAddToCart}>
                   {cart[configuringItem.id] ? 'Update Item' : 'Add to Cart'}
                </Button>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}