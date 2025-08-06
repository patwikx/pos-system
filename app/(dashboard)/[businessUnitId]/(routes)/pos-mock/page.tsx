"use client";

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, Order, OrderItem } from '@/types/pos-types';
import { mockTables, mockUsers, mockShift } from '@/lib/mock-data';
import { Search, UserPlus, RotateCcw, Settings, BarChart3, Users, MapPin, Filter, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { TableCard } from './components/table-card';
import { OrderCart } from './components/order-cart';
import { MenuDialogx } from './components/menu-dialog';


export default function POSPage() {
  const [tables, setTables] = useState<Table[]>(mockTables);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [menuDialogOpen, setMenuDialogOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilter, setSectionFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Walk-in customer table
  const walkInTable: Table = {
    id: 'walk-in',
    name: 'Walk-in',
    businessUnitId: '1',
    status: 'AVAILABLE',
    capacity: 0,
  };

  const sections = [
    'All',
    ...Array.from(
      new Set(tables.map(t => t.section).filter((s): s is string => Boolean(s)))
    ),
  ];
  const statuses = ['All', 'AVAILABLE', 'OCCUPIED', 'RESERVED'];

  const filteredTables = tables.filter(table => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = table.name.toLowerCase().includes(searchLower) ||
                          table.waiter?.name.toLowerCase().includes(searchLower);
    const matchesSection = sectionFilter === 'All' || table.section === sectionFilter;
    const matchesStatus = statusFilter === 'All' || table.status === statusFilter;
    return matchesSearch && matchesSection && matchesStatus;
  });

  const handleTableClick = (table: Table) => {
    setSelectedTable(table);
    
    // If table has an existing order, load it into the cart.
    if (table.currentOrder) {
      setCurrentOrder(table.currentOrder);
    } else {
      // For a new order, clear the cart and open the menu.
      setCurrentOrder(null); 
      setMenuDialogOpen(true);
    }
  };

  const handleAddToOrder = (tableId: string, items: OrderItem[]) => {
    // If there's no current order, create a new one.
    const orderToUpdate = currentOrder ?? {
      id: Date.now().toString(),
      businessUnitId: '1',
      tableId: tableId,
   table: selectedTable || undefined, // <-- FIX IS HERE
      userId: mockUsers[0].id,
      user: mockUsers[0],
      terminalId: '1',
      status: 'OPEN',
      orderType: tableId === 'walk-in' ? 'Take-Out' : 'Dine-In',
      items: [],
      subTotal: 0,
      discountValue: 0,
      tax: 0,
      totalAmount: 0,
      amountPaid: 0,
      isPaid: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedOrder = {
      ...orderToUpdate,
      items: [...orderToUpdate.items, ...items],
      updatedAt: new Date(),
    };

    // Recalculate totals
    const subtotal = updatedOrder.items.reduce((sum, item) => sum + (item.priceAtSale * item.quantity), 0);
    const tax = subtotal * 0.1;
    const total = subtotal + tax - updatedOrder.discountValue;

    updatedOrder.subTotal = subtotal;
    updatedOrder.tax = tax;
    updatedOrder.totalAmount = total;

    setCurrentOrder(updatedOrder);
    
    // Update table status only for dine-in
    if (tableId !== 'walk-in') {
      setTables(prev => prev.map(table => 
        table.id === tableId 
          ? { ...table, status: 'OCCUPIED' }
          : table
      ));
    }

    toast.success(`${items.length} item(s) added to order`);
  };

  const handleUpdateOrder = (order: Order) => {
    setCurrentOrder(order);
    
    // Update table with new order info if it exists in the main list
    if (order.tableId !== 'walk-in') {
      setTables(prev => prev.map(table => 
        table.id === order.tableId 
          ? { ...table, currentOrder: order }
          : table
      ));
    }
  };

  const handleSendToKitchen = (orderId: string) => {
    if (!currentOrder) return;
    
    const updatedOrder = { 
      ...currentOrder, 
      status: 'PREPARING' as const,
      estimatedCompletionTime: new Date(Date.now() + 20 * 60 * 1000) // 20 minutes from now
    };
    
    // Store the finalized order on the table
    if (currentOrder.tableId !== 'walk-in') {
      setTables(prev => prev.map(table => 
        table.id === currentOrder.tableId 
          ? { ...table, currentOrder: updatedOrder, status: 'OCCUPIED', waiter: currentOrder.user }
          : table
      ));
    }
    
    // Clear the current order from the cart
    setCurrentOrder(null);
    setSelectedTable(null);
    setMenuDialogOpen(false);

    toast.success('Order sent to kitchen! 👨‍🍳');
  };

  const handleGenerateBill = (paymentDetails: any) => {
    if (!currentOrder) return;
    
    // In a real app, you would save the paymentDetails to your backend.
    console.log("Processing bill with details:", paymentDetails);

    // Free up the table
    if (currentOrder.tableId !== 'walk-in') {
      setTables(prev => prev.map(table => 
        table.currentOrder?.id === currentOrder.id
          ? { ...table, status: 'AVAILABLE', currentOrder: undefined, waiter: undefined }
          : table
      ));
    }

    // Clear the current order and close dialogs
    setCurrentOrder(null);
    setSelectedTable(null);
    setMenuDialogOpen(false);

    toast.success('Payment processed! Receipt generated. 🧾');
  };

  const handleWalkInCustomer = () => {
    handleTableClick(walkInTable);
  };

  const getTableStats = () => {
    const available = tables.filter(t => t.status === 'AVAILABLE').length;
    const occupied = tables.filter(t => t.status === 'OCCUPIED').length;
    const reserved = tables.filter(t => t.status === 'RESERVED').length;
    return { available, occupied, reserved, total: tables.length };
  };

  const tableStats = getTableStats();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1920px] mx-auto p-6">
        {/* Header */}
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
                  Shift: {mockShift.user.name}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button onClick={handleWalkInCustomer} variant="outline" className="h-11">
                <UserPlus className="h-4 w-4 mr-2" />
                Walk-in Customer
              </Button>
              <Button variant="outline" className="h-11">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button variant="outline" className="h-11">
                <RotateCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="grid grid-cols-12 gap-6">
          {/* Tables Section */}
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
                      placeholder="Search tables or waiters..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-56"
                    />
                  </div>
                  <Select value={sectionFilter} onValueChange={setSectionFilter}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {sections.map(section => (
                        <SelectItem key={section} value={section}>{section}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statuses.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="overflow-y-auto flex-1 pr-2">
                <AnimatePresence>
                  {sections.filter(s => s !== 'All' && filteredTables.some(t => t.section === s)).map(section => (
                    <div key={section} className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin className="h-5 w-5 text-gray-500" />
                        <h3 className="text-lg font-semibold text-gray-700">{section}</h3>
                        <div className="h-px bg-gray-200 flex-1" />
                      </div>
                      <div className="grid grid-cols-4 gap-4">
                        {filteredTables.filter(table => table.section === section).map(table => (
                          <motion.div key={table.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <TableCard table={table} onClick={handleTableClick} />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {filteredTables.filter(table => !table.section).length > 0 && (
                     <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <h3 className="text-lg font-semibold text-gray-700">Other Tables</h3>
                          <div className="h-px bg-gray-200 flex-1" />
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                          {filteredTables.filter(table => !table.section).map(table => (
                             <motion.div key={table.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                               <TableCard table={table} onClick={handleTableClick} />
                             </motion.div>
                          ))}
                        </div>
                     </div>
                  )}
                </AnimatePresence>
              </div>
            </Card>
          </div>

          {/* Order Cart */}
          <div className="col-span-4">
            <OrderCart
              currentOrder={currentOrder}
              onUpdateOrder={handleUpdateOrder}
              onSendToKitchen={handleSendToKitchen}
              onGenerateBill={handleGenerateBill}
              onAddItemsClick={() => setMenuDialogOpen(true)}
            />
          </div>
        </div>
        
        {/* Menu Dialog */}
        <MenuDialogx
          open={menuDialogOpen}
          onClose={() => setMenuDialogOpen(false)}
          table={selectedTable}
          onAddToOrder={handleAddToOrder}
        />
      </div>
    </div>
  );
}