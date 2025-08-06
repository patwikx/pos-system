import { LucideIcon } from "lucide-react";


export interface BusinessUnit {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  name: string;
  username: string;
  isActive: boolean;
  role: string;
}

export interface Table {
  id: string;
  name: string;
  businessUnitId: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';
  capacity?: number;
  currentOrder?: Order;
  waiter?: User;
  section?: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  businessUnitId: string;
  prepStation?: string;
  imageUrl?: string;
  sortOrder: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isActive: boolean;
  categoryId: string;
  category: MenuCategory;
  businessUnitId: string;
  preparationTime?: number;
  allergens?: string[];
  nutritionalInfo?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  modifierGroups?: ModifierGroup[];
}

export interface ModifierGroup {
  id: string;
  name: string;
  businessUnitId: string;
  required: boolean;
  maxSelections: number;
  modifiers: Modifier[];
}

export interface Modifier {
  id: string;
  name: string;
  priceChange: number;
  modifierGroupId: string;
  inventoryItemId?: string;
  quantityUsed?: number;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  menuItem: MenuItem;
  quantity: number;
  priceAtSale: number;
  notes?: string;
  kdsStatus: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED';
  isVoided: boolean;
  voidedAt?: Date;
  voidReason?: string;
  modifiers: Modifier[];
  addedAt: Date;
  estimatedReadyTime?: Date;
}

export interface Order {
  id: string;
  businessUnitId: string;
  tableId?: string;
  table?: Table;
  userId: string;
  user: User;
  terminalId: string;
  status: 'OPEN' | 'PREPARING' | 'SERVED' | 'PAID' | 'CANCELLED';
  orderType: string;
  items: OrderItem[];
  subTotal: number;
  discountValue: number;
  tax: number;
  totalAmount: number;
  amountPaid: number;
  isPaid: boolean;
  discountId?: string;
  discount?: Discount;
  shiftId?: string;
  businessPartnerId?: string;
  businessPartner?: BusinessPartner;
  createdAt: Date;
  updatedAt: Date;
  estimatedCompletionTime?: Date;
  specialInstructions?: string;
}

export interface Discount {
  id: string;
  name: string;
  description?: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  value: number;
  isActive: boolean;
  businessUnitId: string;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  validFrom?: Date;
  validTo?: Date;
}


export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  processedByUserId: string;
  processedByUser: User;
  shiftId: string;
  createdAt: Date;
}

export interface BusinessPartner {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  loyaltyPoints: number;
  membershipTier?: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  totalSpent?: number;
  lastVisit?: Date;
}

export interface Shift {
  id: string;
  businessUnitId: string;
  userId: string;
  user: User;
  terminalId: string;
  startedAt: Date;
  endedAt?: Date;
  startingCash: number;
  endingCash?: number;
  expectedCash?: number;
  cashDifference?: number;
  notes?: string;
  totalSales?: number;
  totalOrders?: number;
}

export interface PosTerminal {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  businessUnitId: string;
  currentShift?: Shift;
}

export interface KitchenDisplayItem {
  id: string;
  orderItem: OrderItem;
  order: Order;
  prepStation: string;
  estimatedTime: number;
  startedAt?: Date;
  completedAt?: Date;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}

export interface InventoryAlert {
  id: string;
  itemName: string;
  currentStock: number;
  reorderPoint: number;
  severity: 'LOW' | 'CRITICAL';
}

export interface SalesMetrics {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  topSellingItems: Array<{
    item: MenuItem;
    quantity: number;
    revenue: number;
  }>;
  hourlyBreakdown: Array<{
    hour: number;
    sales: number;
    orders: number;
  }>;
}


export interface PaymentMethod {
  id: string;
  name: string;
  type: 'cash' | 'card' | 'ewallet' | 'bank_transfer';
  icon: LucideIcon; // This is the correct type
  isActive: boolean;
  processingFee?: number;
}