"use client";

import { useState, useMemo, Fragment } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Table, MenuItem, OrderItem, ModifierGroup, Modifier } from '@/types/pos-types';
import { mockMenuItems, mockMenuCategories } from '@/lib/mock-data';
import { Plus, Minus, ShoppingCart, Search, Clock, Trash2, Edit, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

// Interface for items in the temporary cart
interface CartItem {
  id: string;
  menuItem: MenuItem;
  quantity: number;
  specialInstructions: string;
  selectedModifiers: { [groupId: string]: string[] };
}

interface MenuDialogProps {
  open: boolean;
  onClose: () => void;
  table: Table | null;
  onAddToOrder: (tableId: string, items: OrderItem[]) => void;
}

export function MenuDialogx({ open, onClose, table, onAddToOrder }: MenuDialogProps) {
  const [cart, setCart] = useState<{ [key: string]: CartItem }>({});
  const [configuringItem, setConfiguringItem] = useState<CartItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = useMemo(() => ['All', ...mockMenuCategories.map(cat => cat.name)], []);

  const filteredItems = useMemo(() => {
    return mockMenuItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || item.category.name === selectedCategory;
      return matchesSearch && matchesCategory && item.isActive;
    });
  }, [searchTerm, selectedCategory]);

  const handleSelectItem = (item: MenuItem) => {
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
    const group = configuringItem.menuItem.modifierGroups?.find(g => g.id === groupId);
    if (!group) return;

    const currentSelections = configuringItem.selectedModifiers[groupId] || [];
    let newSelections: string[];

    if (group.maxSelections === 1) {
      newSelections = isSelected ? [modifierId] : [];
    } else {
      if (isSelected) {
        newSelections = [...currentSelections, modifierId];
        if (group.maxSelections > 0 && newSelections.length > group.maxSelections) {
          newSelections.shift();
        }
      } else {
        newSelections = currentSelections.filter(id => id !== modifierId);
      }
    }
    updateConfiguringItem({
      selectedModifiers: { ...configuringItem.selectedModifiers, [groupId]: newSelections }
    });
  };

  const isConfigurationValid = useMemo(() => {
    if (!configuringItem) return false;
    return configuringItem.menuItem.modifierGroups?.every(group => {
      const selections = configuringItem.selectedModifiers[group.id] || [];
      return selections.length >= group.maxSelections;
    }) ?? true;
  }, [configuringItem]);
  
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
    const orderItems: OrderItem[] = Object.values(cart).map(cartItem => {
      const allModifiers: Modifier[] = [];
       Object.entries(cartItem.selectedModifiers).forEach(([groupId, modifierIds]) => {
          const group = cartItem.menuItem.modifierGroups?.find(g => g.id === groupId);
          modifierIds.forEach(modifierId => {
            const modifier = group?.modifiers.find(m => m.id === modifierId);
            if (modifier) allModifiers.push(modifier);
          });
       });

      return {
        id: uuidv4(),
        orderId: '',
        menuItemId: cartItem.menuItem.id,
        menuItem: cartItem.menuItem,
        quantity: cartItem.quantity,
        priceAtSale: calculateItemPrice(cartItem),
        notes: cartItem.specialInstructions,
        kdsStatus: 'PENDING',
        isVoided: false,
        modifiers: allModifiers,
        addedAt: new Date(),
        estimatedReadyTime: new Date(Date.now() + (cartItem.menuItem.preparationTime || 10) * 60000),
      };
    });
    onAddToOrder(table.id, orderItems);
    setCart({});
    onClose();
  };

  const totalItems = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = Object.values(cart).reduce((sum, item) => sum + (calculateItemPrice(item) * item.quantity), 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="!w-[1280px] !h-[830px] !max-w-none !max-h-none flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-xl font-semibold">
            Menu - {table ? table.name : 'Walk-in Customer'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-6 p-4 flex-1 overflow-hidden">
          {/* Menu Section */}
          <div className="flex-[3] flex flex-col min-w-0">
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="flex-1 flex flex-col min-h-0 border rounded-lg">
              <div className="p-3 border-b bg-gray-50/50 rounded-t-lg">
                <div className="flex gap-3">
                   <div className="relative flex-1">
                     <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                     <Input placeholder="Search menu items..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
                   </div>
                </div>
                <TabsList className="grid w-full grid-cols-7 mt-3">
                  {categories.map(category => (
                    <TabsTrigger key={category} value={category} className="text-xs">{category}</TabsTrigger>
                  ))}
                </TabsList>
              </div>
              <div className="p-3 flex-1 overflow-y-auto">
                <div className="grid grid-cols-4 gap-3">
                  {filteredItems.map(item => (
                    <Card key={item.id} className="p-3 flex flex-col justify-between hover:border-blue-500 hover:shadow-sm transition-all">
                       <div>
                         {item.imageUrl && (
                           <img src={item.imageUrl} alt={item.name} className="w-full h-24 object-cover rounded-md mb-2" />
                         )}
                         <h4 className="font-semibold text-sm leading-tight">{item.name}</h4>
                         <p className="text-xs text-gray-600 mt-1 line-clamp-2">{item.description}</p>
                       </div>
                       <div className="mt-3 flex items-center justify-between">
                         <span className="font-bold text-base">${item.price.toFixed(2)}</span>
                         <Button onClick={() => handleSelectItem(item)} size="sm" className="h-8">Add</Button>
                       </div>
                     </Card>
                  ))}
                </div>
              </div>
            </Tabs>
          </div>

          {/* Order Summary */}
          <div className="flex-[2] flex flex-col">
            <Card className="p-4 flex-1 flex flex-col">
              <h3 className="font-semibold text-lg mb-3">Order Summary</h3>
              {totalItems > 0 ? (
                 <>
                   <div className="space-y-3 mb-4 flex-1 overflow-y-auto pr-2">
                     {Object.values(cart).map(cartItem => (
                       <div key={cartItem.id} className="border rounded-md p-3 bg-white">
                         <div className="flex justify-between items-start">
                           <div className="flex-1 pr-2">
                             <h4 className="font-medium text-sm">{cartItem.menuItem.name}</h4>
                             <p className="text-xs text-gray-500">{`${cartItem.quantity} × $${calculateItemPrice(cartItem).toFixed(2)}`}</p>
                           </div>
                           <span className="font-semibold text-sm">${(calculateItemPrice(cartItem) * cartItem.quantity).toFixed(2)}</span>
                         </div>
                         <div className="text-xs text-gray-600 mt-1 pl-1">
                           {Object.values(cartItem.selectedModifiers).flat().map(modId => {
                              const mod = cartItem.menuItem.modifierGroups?.flatMap(g => g.modifiers).find(m => m.id === modId);
                              return mod ? <div key={modId}>+ {mod.name}</div> : null;
                           })}
                           {cartItem.specialInstructions && <div className="italic text-purple-600">Note: {cartItem.specialInstructions}</div>}
                         </div>
                         <div className="flex items-center justify-end gap-2 border-t mt-2 pt-2">
                           <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => {
                             const {[cartItem.id]: removed, ...rest} = cart;
                             setCart(rest);
                             setConfiguringItem(cartItem);
                           }}>
                             <Edit className="h-3 w-3" />
                           </Button>
                           <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => {
                              const {[cartItem.id]: removed, ...rest} = cart;
                              setCart(rest);
                           }}>
                             <Trash2 className="h-4 w-4" />
                           </Button>
                         </div>
                       </div>
                     ))}
                   </div>
                   <div className="border-t pt-3">
                     <div className="flex justify-between font-semibold"><p>Total</p><p>${totalPrice.toFixed(2)}</p></div>
                     <Button onClick={handleFinalAddToOrder} className="w-full mt-3 h-12 text-base font-bold">
                       Add {totalItems} Item(s) to Order
                     </Button>
                   </div>
                 </>
              ) : (
                <div className="text-center text-gray-500 flex flex-col items-center justify-center h-full">
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
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{configuringItem.menuItem.name}</DialogTitle>
                <DialogDescription>{configuringItem.menuItem.description}</DialogDescription>
              </DialogHeader>
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
                    <p className="text-xs text-gray-500 mb-2">
                        {group.required && <span className="text-red-500 font-medium">Required. </span>}
                        Select {group.maxSelections === group.maxSelections ? `exactly ${group.maxSelections}` : `between ${group.maxSelections} and ${group.maxSelections}`}.
                    </p>
                    {group.maxSelections === 1 ? (
                       <RadioGroup value={configuringItem.selectedModifiers[group.id]?.[0] || ''} onValueChange={(value) => updateModifierSelection(group.id, value, true)} className="space-y-1">
                          {group.modifiers.map(modifier => (
                            <Label key={modifier.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-50 cursor-pointer">
                              <RadioGroupItem value={modifier.id} id={`${group.id}-${modifier.id}`} />
                              <span className="flex-1">{modifier.name}</span>
                              {modifier.priceChange !== 0 && <span className="text-green-600 font-medium">{modifier.priceChange > 0 ? '+' : ''}${modifier.priceChange.toFixed(2)}</span>}
                            </Label>
                          ))}
                       </RadioGroup>
                    ) : (
                       <div className="space-y-1">
                          {group.modifiers.map(modifier => (
                            <Label key={modifier.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-50 cursor-pointer">
                              <Checkbox id={`${group.id}-${modifier.id}`} checked={configuringItem.selectedModifiers[group.id]?.includes(modifier.id) || false} onCheckedChange={(checked) => updateModifierSelection(group.id, modifier.id, !!checked)} />
                              <span className="flex-1">{modifier.name}</span>
                              {modifier.priceChange !== 0 && <span className="text-green-600 font-medium">{modifier.priceChange > 0 ? '+' : ''}${modifier.priceChange.toFixed(2)}</span>}
                            </Label>
                          ))}
                       </div>
                    )}
                  </div>
                ))}
                <div className="border-t pt-3">
                  <Label htmlFor="instructions" className="font-semibold">Special Instructions (Optional)</Label>
                  <Textarea id="instructions" placeholder="e.g., extra spicy, no onions..." value={configuringItem.specialInstructions} onChange={(e) => updateConfiguringItem({ specialInstructions: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setConfiguringItem(null)}>Cancel</Button>
                <Button onClick={handleAddToCart} disabled={!isConfigurationValid}>
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