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
    const matchesSearch = table.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         table.waiter?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSection = sectionFilter === 'All' || table.section === sectionFilter;
    const matchesStatus = statusFilter === 'All' || table.status === statusFilter;
    return matchesSearch && matchesSection && matchesStatus;
  });

  const handleTableClick = (table: Table) => {
    setSelectedTable(table);
    setMenuDialogOpen(true);
    
    // If table has an existing order, load it
    if (table.currentOrder) {
      setCurrentOrder(table.currentOrder);
    } else {
      // Create new order
      const newOrder: Order = {
        id: Date.now().toString(),
        businessUnitId: '1',
        tableId: table.id,
        table: table,
        userId: mockUsers[0].id,
        user: mockUsers[0],
        terminalId: '1',
        status: 'OPEN',
        orderType: table.id === 'walk-in' ? 'Take-Out' : 'Dine-In',
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
      setCurrentOrder(newOrder);
    }
  };

  const handleAddToOrder = (tableId: string, items: OrderItem[]) => {
    if (!currentOrder) return;
    
    const updatedOrder = {
      ...currentOrder,
      items: [...currentOrder.items, ...items],
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
    
    // Update table status
    if (tableId !== 'walk-in') {
      setTables(prev => prev.map(table => 
        table.id === tableId 
          ? { ...table, status: 'OCCUPIED', currentOrder: updatedOrder }
          : table
      ));
    }

    toast.success(`${items.length} item(s) added to order`);
  };

  const handleUpdateOrder = (order: Order) => {
    setCurrentOrder(order);
    
    // Update table with new order
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
    setCurrentOrder(updatedOrder);
    
    if (currentOrder.tableId !== 'walk-in') {
      setTables(prev => prev.map(table => 
        table.currentOrder?.id === orderId 
          ? { ...table, currentOrder: updatedOrder }
          : table
      ));
    }

    toast.success('Order sent to kitchen! 👨‍🍳');
  };

  const handleGenerateBill = (orderId: string) => {
    if (!currentOrder) return;
    
    const updatedOrder = { ...currentOrder, status: 'PAID' as const, isPaid: true };
    setCurrentOrder(null);
    
    // Free up the table
    if (currentOrder.tableId !== 'walk-in') {
      setTables(prev => prev.map(table => 
        table.currentOrder?.id === orderId 
          ? { ...table, status: 'AVAILABLE', currentOrder: undefined, waiter: undefined }
          : table
      ));
    }

    toast.success('Payment processed! Receipt generated. 🧾');
  };

  const handleWalkInCustomer = () => {
    setSelectedTable(walkInTable);
    setMenuDialogOpen(true);
    
    const newOrder: Order = {
      id: Date.now().toString(),
      businessUnitId: '1',
      tableId: 'walk-in',
      userId: mockUsers[0].id,
      user: mockUsers[0],
      terminalId: '1',
      status: 'OPEN',
      orderType: 'Take-Out',
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
    setCurrentOrder(newOrder);
  };

  const getTableStats = () => {
    const available = tables.filter(t => t.status === 'AVAILABLE').length;
    const occupied = tables.filter(t => t.status === 'OCCUPIED').length;
    const reserved = tables.filter(t => t.status === 'RESERVED').length;
    return { available, occupied, reserved, total: tables.length };
  };

  const tableStats = getTableStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-[1920px] mx-auto p-6">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-700 rounded-xl flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Restaurant POS</h1>
                <p className="text-gray-600">
                  {currentTime.toLocaleDateString()} • {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • 
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

        {/* Dashboard Stats 
        <div className="mb-8">
          <DashboardStats />
        </div>
*/}
        <div className="grid grid-cols-4 gap-6 mt-[20px]">
          {/* Tables Section */}
          <div className="col-span-3">
            <div className="!h-[700px] !max-w-none !max-h-none p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-bold">Tables</h2>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-800">
                      {tableStats.available} Available
                    </Badge>
                    <Badge className="bg-blue-100 text-blue-800">
                      {tableStats.occupied} Occupied
                    </Badge>
                    <Badge className="bg-yellow-100 text-yellow-800">
                      {tableStats.reserved} Reserved
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                    <Input
                      placeholder="Search tables..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  
                  <Select value={sectionFilter} onValueChange={setSectionFilter}>
                    <SelectTrigger className="w-40">
                      <MapPin className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sections.map(section => (
                        <SelectItem key={section} value={section}>{section}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="overflow-y-auto h-full">
                {/* Group tables by section */}
                {sections.filter(section => section !== 'All').map(section => {
                  const sectionTables = filteredTables.filter(table => table.section === section);
                  if (sectionTables.length === 0) return null;
                  
                  return (
                    <div key={section} className="mb-8">
                      <div className="flex items-center gap-2 mb-4">
                        <MapPin className="h-5 w-5 text-gray-500" />
                        <h3 className="text-lg font-semibold text-gray-700">{section}</h3>
                        <div className="h-px bg-gray-200 flex-1" />
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4">
                   
                          {sectionTables.map(table => (
                        <div key={table.id} className="col-span-1">
                              <TableCard
                                table={table}
                                onClick={handleTableClick}
                              />
                          </div>
                          ))}
                      
                      </div>
                    </div>
                  );
                })}
                
                {/* Tables without section */}
                {filteredTables.filter(table => !table.section).length > 0 && (
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="text-lg font-semibold text-gray-700">Other Tables</h3>
                      <div className="h-px bg-gray-200 flex-1" />
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4">
                      
                        {filteredTables.filter(table => !table.section).map(table => (
                          <motion.div
                            key={table.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.2 }}
                          >
                            <TableCard
                              table={table}
                              onClick={handleTableClick}
                            />
                          </motion.div>
                        ))}
                  
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Order Cart */}
          <div className="col-span-1">
            <div className="h-[calc(100vh-400px)]">
              <OrderCart
                currentOrder={currentOrder}
                onUpdateOrder={handleUpdateOrder}
                onSendToKitchen={handleSendToKitchen}
                onGenerateBill={handleGenerateBill}
              />
            </div>
                 <MenuDialogx
        open={menuDialogOpen}
        onClose={() => setMenuDialogOpen(false)}
        table={selectedTable}
        onAddToOrder={handleAddToOrder}
      />
          </div>
        </div>
      </div>

 
    </div>
  );
}