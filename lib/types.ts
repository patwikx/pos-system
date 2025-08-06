import type {
  User,
  Restaurant,
  Table,
  Order,
  OrderItem,
  MenuItem,
  MenuCategory,
  Product,
  Modifier,
  ModifierGroup,
  Customer,
  Payment,
  Tip,
  Discount,
  InventoryItem,
  AuditLog,
  Role,
  TableStatus,
  OrderStatus,
  OrderItemStatus,
  DiscountType,
} from "@prisma/client"

export type {
  User,
  Restaurant,
  Table,
  Order,
  OrderItem,
  MenuItem,
  MenuCategory,
  Product,
  Modifier,
  ModifierGroup,
  Customer,
  Payment,
  Tip,
  Discount,
  InventoryItem,
  AuditLog,
  Role,
  TableStatus,
  OrderStatus,
  OrderItemStatus,
  DiscountType,
}

export interface ExtendedUser extends User {
  restaurant: Restaurant
}

export interface TableWithSession extends Table {
  tableSessions: Array<{
    id: string
    startTime: Date
    endTime: Date | null
    order: Order & {
      server: User
      orderItems: OrderItem[]
    }
  }>
}

export interface OrderWithDetails extends Order {
  orderItems: Array<
    OrderItem & {
      menuItem: MenuItem & {
        product: Product
      }
      appliedModifiers: Array<{
        modifier: Modifier
      }>
    }
  >
  customer?: Customer | null
  discount?: Discount | null
  server: User
}

export interface MenuItemWithDetails extends MenuItem {
  product: Product
  category: MenuCategory
  modifierGroups: Array<
    ModifierGroup & {
      modifiers: Modifier[]
    }
  >
}

export interface BranchInfo {
  code: string
  name: string
  restaurantId: string
}

export const BRANCHES: Record<string, BranchInfo> = {
  ah: { code: "ah", name: "Ayala Heights", restaurantId: "ah-restaurant-id" },
  dlr: { code: "dlr", name: "De La Rosa", restaurantId: "dlr-restaurant-id" },
  dtr: { code: "dtr", name: "Downtown", restaurantId: "dtr-restaurant-id" },
  dfr: { code: "dfr", name: "Del Fierro", restaurantId: "dfr-restaurant-id" },
}


export interface BusinessUnitItem {
  id: string;
  name: string;
}