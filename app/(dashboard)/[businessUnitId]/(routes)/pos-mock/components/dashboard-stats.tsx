"use client";

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Clock, AlertTriangle, ChefHat } from 'lucide-react';
import { mockSalesMetrics, mockShift, mockInventoryAlerts, mockKitchenItems } from '@/lib/mock-data';
import { motion } from 'framer-motion';

export function DashboardStats() {
  const stats = [
    {
      title: 'Today\'s Sales',
      value: `$${mockSalesMetrics.totalSales.toLocaleString()}`,
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      color: 'from-green-500 to-emerald-600',
    },
    {
      title: 'Orders',
      value: mockSalesMetrics.totalOrders.toString(),
      change: '+8.2%',
      trend: 'up',
      icon: ShoppingCart,
      color: 'from-blue-500 to-indigo-600',
    },
    {
      title: 'Avg Order Value',
      value: `$${mockSalesMetrics.averageOrderValue.toFixed(2)}`,
      change: '+5.1%',
      trend: 'up',
      icon: TrendingUp,
      color: 'from-purple-500 to-pink-600',
    },
    {
      title: 'Active Tables',
      value: '8',
      change: '2 reserved',
      trend: 'neutral',
      icon: Users,
      color: 'from-orange-500 to-red-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-4 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <div className="flex items-center mt-1">
                    {stat.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-600 mr-1" />}
                    {stat.trend === 'down' && <TrendingDown className="h-4 w-4 text-red-600 mr-1" />}
                    <span className={`text-sm ${
                      stat.trend === 'up' ? 'text-green-600' : 
                      stat.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {stat.change}
                    </span>
                  </div>
                </div>
                <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-lg flex items-center justify-center`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-3 gap-4">
        {/* Current Shift */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
            <h3 className="font-semibold">Current Shift</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Started:</span>
              <span>{mockShift.startedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Sales:</span>
              <span className="font-medium text-green-600">${mockShift.totalSales?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Orders:</span>
              <span className="font-medium">{mockShift.totalOrders}</span>
            </div>
          </div>
        </Card>

        {/* Kitchen Status */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <ChefHat className="h-4 w-4 text-orange-600" />
            </div>
            <h3 className="font-semibold">Kitchen Status</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Pending:</span>
              <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                {mockKitchenItems.filter(item => item.orderItem.kdsStatus === 'PENDING').length}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span>Preparing:</span>
              <Badge variant="outline" className="text-orange-700 border-orange-300">
                {mockKitchenItems.filter(item => item.orderItem.kdsStatus === 'PREPARING').length}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span>Ready:</span>
              <Badge variant="outline" className="text-green-700 border-green-300">
                {mockKitchenItems.filter(item => item.orderItem.kdsStatus === 'READY').length}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Inventory Alerts */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
            <h3 className="font-semibold">Inventory Alerts</h3>
          </div>
          <div className="space-y-2">
            {mockInventoryAlerts.map(alert => (
              <div key={alert.id} className="flex items-center justify-between text-sm">
                <span className="truncate">{alert.itemName}</span>
                <Badge 
                  variant="outline" 
                  className={alert.severity === 'CRITICAL' ? 'text-red-700 border-red-300' : 'text-yellow-700 border-yellow-300'}
                >
                  {alert.currentStock}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}