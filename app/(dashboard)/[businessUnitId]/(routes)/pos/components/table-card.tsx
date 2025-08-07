"use client";

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, User, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Table, Order, User as PrismaUser, TableStatus } from "@prisma/client";

export type TableWithOrder = Table & {
  currentOrder: (Order & { user: PrismaUser | null }) | null;
};

interface TableCardProps {
  table: TableWithOrder;
  onClick: (table: TableWithOrder) => void;
}

const statusConfig: Record<TableStatus, { colors: string; badge: string; icon: string }> = {
  AVAILABLE: {
    colors: 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:from-green-100 hover:to-emerald-100 shadow-green-100',
    badge: 'bg-green-100 text-green-800 border-green-200',
    icon: '🟢',
  },
  OCCUPIED: {
    colors: 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:from-blue-100 hover:to-indigo-100 shadow-blue-100',
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: '🔵',
  },
  RESERVED: {
    colors: 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200 hover:from-amber-100 hover:to-yellow-100 shadow-amber-100',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: '🟡',
  },
};

export function TableCard({ table, onClick }: TableCardProps) {
  const config = statusConfig[table.status];
  const waiterName = table.currentOrder?.user?.name || null;

  return (
    <div
      className={cn(
        'p-4 cursor-pointer transition-all duration-300 hover:shadow-lg border-2',
        config.colors
      )}
      onClick={() => onClick(table)}
    >
     <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{config.icon}</span>
            <h3 className="text-lg font-bold text-gray-900">{table.name}</h3>
          </div>
          <Badge className={cn('font-medium border', config.badge)}>
            {table.status.replace('_', ' ')}
          </Badge>
        </div>

      {/* Details */}
      <div className="space-y-2">
        {/* Waiter */}
        {waiterName && (
          <div className="flex items-center text-sm text-gray-700">
            <User className="h-4 w-4 mr-2 text-gray-500" />
            <span className="font-medium">{waiterName}</span>
          </div>
        )}

        {/* Order (if OCCUPIED) */}
        {table.status === 'OCCUPIED' && table.currentOrder && (
          <div className="space-y-1 mt-2">
            <div className="flex items-center text-sm text-blue-700 bg-blue-50 rounded-md px-2 py-1">
              <Clock className="h-4 w-4 mr-2" />
              <span className="font-medium">Order #{table.currentOrder.id.slice(-4)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
