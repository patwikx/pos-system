"use client";

import { useState, useEffect, useMemo, startTransition } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MenuDialog, NewOrderItem } from './menu-dialog';
import { OrderCart, OrderWithDetails } from './order-cart';
import { Search, UserPlus, RotateCcw, BarChart3, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { TableCard, TableWithOrder } from './table-card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

import { Table, BusinessPartner, MenuCategory, MenuItem, ModifierGroup, Modifier, Discount, Shift, PosTerminal, User, OrderStatus } from "@prisma/client";
import { useCurrentUser } from '@/lib/current-user';
import { createOrUpdateOrder } from '@/lib/actions/pos-actions';

// Define the detailed types for data passed as props
type FullMenuItem = MenuItem & { category: MenuCategory; modifierGroups: (ModifierGroup & { modifiers: Modifier[] })[] };
// FIX 1: The FullShift type now correctly includes the nested terminal
type FullShift = Shift & { user: User; terminal: PosTerminal };
type SimpleUser = { id: string; name: string | null; };

interface PosClientProps {
    initialTables: TableWithOrder[];
    menuItems: FullMenuItem[];
    categories: MenuCategory[];
    discounts: Discount[];
    businessPartners: BusinessPartner[];
    users: SimpleUser[];
    activeShift: FullShift | null;
    activeTerminal: PosTerminal;
}

export const PosClient: React.FC<PosClientProps> = ({
    initialTables, menuItems, categories, discounts, businessPartners, users, activeShift, activeTerminal
}) => {
  const currentUser = useCurrentUser();
  const router = useRouter();
  const [tables, setTables] = useState(initialTables);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [menuDialogOpen, setMenuDialogOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<OrderWithDetails | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update time every minute to match the target UI
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // A temporary object for walk-in orders, ensuring it matches the Table type
  const walkInTable: Table = {
    id: 'walk-in',
    name: 'Walk-in / Take-Out',
    status: 'AVAILABLE',
    businessUnitId: activeTerminal.businessUnitId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const statuses = ['All', 'AVAILABLE', 'OCCUPIED', 'RESERVED'];

  const filteredTables = tables.filter(table => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = table.name.toLowerCase().includes(searchLower) ||
                          table.currentOrder?.user?.name?.toLowerCase().includes(searchLower);
    const matchesStatus = statusFilter === 'All' || table.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const createNewOrderForTable = (table: Table): OrderWithDetails | null => {
    if (!currentUser || !activeTerminal || !activeShift) {
      toast.error("Cannot create order: missing session, terminal, or shift.");
      return null;
    }
    
    const userForOrder: User = {
      id: currentUser.id!, name: currentUser.name || null, username: currentUser.username || null,
      password: '', createdAt: new Date(), updatedAt: new Date(), isActive: currentUser.isActive || false,
    };
    
    // FIX 2: This object now perfectly matches the OrderWithDetails type, resolving all errors
    return {
      id: `temp_${Date.now()}`, businessUnitId: table.businessUnitId,
      tableId: table.id, table: table, userId: currentUser.id!, user: userForOrder,
      terminalId: activeTerminal.id, status: 'OPEN', orderType: table.id === 'walk-in' ? 'Take-Out' : 'Dine-In',
      items: [], subTotal: 0, discountValue: 0, tax: 0, totalAmount: 0, amountPaid: 0, isPaid: false,
      discountId: null, discount: null, createdAt: new Date(), updatedAt: new Date(),
      shiftId: activeShift.id, shift: activeShift,
      businessPartnerId: null, businessPartner: null,
      payments: [],
      invoice: null,
    };
  }

  const handleTableClick = (table: TableWithOrder) => {
    if (table.currentOrder) {
        setCurrentOrder(table.currentOrder as OrderWithDetails);
        setSelectedTable(table);
    } else {
        const newOrder = createNewOrderForTable(table);
        if (newOrder) {
            setCurrentOrder(newOrder);
            setSelectedTable(table);
            setMenuDialogOpen(true);
        }
    }
  };
  
  const handleAddToOrder = (tableId: string, items: NewOrderItem[]) => {
    const orderToUpdate = currentOrder ?? createNewOrderForTable(selectedTable || walkInTable);
    if (!orderToUpdate) return;
    
    const newItems: OrderWithDetails['items'] = items.map(item => ({
        ...item,
        id: `temp_item_${Date.now()}_${Math.random()}`, orderId: orderToUpdate.id,
        isVoided: false, voidedAt: null, voidedByUserId: null, voidReason: null, voidedByUser: null,
    }));

    const updatedItems = [...orderToUpdate.items, ...newItems];
    const subTotal = updatedItems.reduce((sum, item) => sum + (item.priceAtSale * item.quantity), 0);
    // Assuming a standard 12% tax rate based on original code
    const tax = subTotal * 0.12;
    const totalAmount = subTotal + tax - (orderToUpdate.discountValue || 0);

    const updatedOrder = { ...orderToUpdate, items: updatedItems, subTotal, tax, totalAmount, updatedAt: new Date() };
    
    setCurrentOrder(updatedOrder);
    if (tableId !== 'walk-in') {
      setTables(prev => prev.map(t => t.id === tableId ? { ...t, status: 'OCCUPIED', currentOrder: updatedOrder } : t));
    }
    toast.success(`${items.length} item(s) added to order`);
  };
  
  const handleUpdateOrder = (order: OrderWithDetails) => {
    setCurrentOrder(order);
    if (order.tableId && order.tableId !== 'walk-in') {
      setTables(prev => prev.map(t => t.id === order.tableId ? { ...t, currentOrder: order } : t));
    }
  };

const handleSendToKitchen = (orderId: string) => {
    if (!currentOrder) return;
    
    // 4. Use startTransition to call the server action without blocking the UI
    startTransition(async () => {
        const result = await createOrUpdateOrder({
            ...currentOrder,
            status: 'PREPARING'
        });

        if (result.error) {
            toast.error(result.error);
        }
        if (result.success && result.order) {
            toast.success('Order sent to kitchen! 👨‍🍳');
            
            // Update the client state with the REAL order from the database
            const savedOrder = result.order as OrderWithDetails;
            setCurrentOrder(savedOrder);
            
            if (savedOrder.tableId && savedOrder.tableId !== 'walk-in') {
                setTables(prev => prev.map(t => 
                    t.id === savedOrder.tableId 
                    ? { ...t, status: 'OCCUPIED', currentOrder: savedOrder } 
                    : t
                ));
            }
        }
    });
  };

  const handlePaymentComplete = () => {
    const tableIdToClear = currentOrder?.tableId;
    setCurrentOrder(null);
    setSelectedTable(null);
    if (tableIdToClear && tableIdToClear !== 'walk-in') {
        setTables(prev => prev.map(t => t.id === tableIdToClear ? { ...t, status: 'AVAILABLE', currentOrder: null } : t));
    }
    toast.success('Payment complete! Receipt generated. 🧾');
  };

  // Memoized stats to match the target UI's header badges
  const tableStats = useMemo(() => ({
      available: tables.filter(t => t.status === 'AVAILABLE').length,
      occupied: tables.filter(t => t.status === 'OCCUPIED').length,
      reserved: tables.filter(t => t.status === 'RESERVED').length
  }), [tables]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1920px] mx-auto p-6">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Restaurant POS</h1>
                <p className="text-gray-600">
                  {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} • {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • 
                  Shift: {activeShift?.user.name || "N/A"}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button onClick={() => handleTableClick(walkInTable as TableWithOrder)} variant="outline" className="h-11">
                <UserPlus className="h-4 w-4 mr-2" />
                Walk-in Customer
              </Button>
              <Button variant="outline" className="h-11" onClick={() => toast.info("Settings not implemented.")}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button variant="outline" className="h-11" onClick={() => router.refresh()}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </header>

        <main className="grid grid-cols-12 gap-6">
          <div className="col-span-8">
            <Card className="h-[calc(100vh-150px)] p-4 flex flex-col">
              <div className="flex items-center justify-between mb-4 pb-4 border-b">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-bold">Tables</h2>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">{tableStats.available} Available</Badge>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">{tableStats.occupied} Occupied</Badge>
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">{tableStats.reserved} Reserved</Badge>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Search tables..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-56"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statuses.map(status => ( <SelectItem key={status} value={status}>{status}</SelectItem> ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <ScrollArea className="flex-1 -m-2 pr-2">
                  <div className="p-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                    <AnimatePresence>
                      {filteredTables.map(table => (
                          <motion.div key={table.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                              <TableCard table={table} onClick={() => handleTableClick(table)} />
                          </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
              </ScrollArea>
            </Card>
          </div>

          <div className="col-span-4">
              <OrderCart
                  currentOrder={currentOrder}
                  users={users}
                  discounts={discounts}
                  businessPartners={businessPartners}
                  onUpdateOrder={handleUpdateOrder}
                  onSendToKitchen={handleSendToKitchen}
                  onPaymentComplete={handlePaymentComplete}
                  // Adding this prop to allow opening menu for an existing order
                  onAddItemsClick={() => setMenuDialogOpen(true)}
              />
          </div>
        </main>
      </div>
      
      <MenuDialog
        open={menuDialogOpen}
        onClose={() => setMenuDialogOpen(false)}
        table={selectedTable}
        onAddToOrder={handleAddToOrder}
        menuItems={menuItems}
        categories={categories}
      />
    </div>
  );
}