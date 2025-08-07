import { startOfDay } from 'date-fns';
import prismadb from '@/lib/db';
import { TableStatus } from '@prisma/client';


// Note: Many types from your mock data like KitchenDisplayItem are "view models",
// meaning we construct them by combining data from multiple database models.

/**
 * Fetches all users and their current role for a specific business unit.
 */
export async function getUsersForBusinessUnit(businessUnitId: string) {
  const assignments = await prismadb.userBusinessUnit.findMany({
    where: { businessUnitId },
    include: { user: true, role: true },
    orderBy: { user: { name: 'asc' } },
  });

  // Transform the data to a simpler shape
  return assignments.map(a => ({
    id: a.user.id,
    name: a.user.name,
    username: a.user.username,
    isActive: a.user.isActive,
    role: a.role.role,
  }));
}

/**
 * Fetches all menu items for a business unit, including their category and modifier groups.
 */
export async function getMenuItems(businessUnitId: string) {
  return prismadb.menuItem.findMany({
    where: { businessUnitId },
    include: {
      category: true,
      modifierGroups: {
        include: { modifiers: true }
      },
    },
    orderBy: { name: 'asc' },
  });
}

/**
 * Fetches all tables for a business unit.
 * Note: The assigned waiter is on the `Order`, not the `Table` itself.
 * This query fetches active order details to find the current waiter for occupied tables.
 */
export async function getTablesWithStatus(businessUnitId: string) {
    const tables = await prismadb.table.findMany({
        where: { businessUnitId },
        orderBy: { name: 'asc' },
        include: {
            orders: {
                where: { status: { notIn: ['PAID', 'CANCELLED'] } },
                include: { user: true }
            }
        }
    });

    return tables.map(table => {
        const activeOrder = table.orders[0];
        return {
            id: table.id,
            name: table.name,
            status: activeOrder ? 'OCCUPIED' : table.status,
            waiter: activeOrder ? activeOrder.user : null
        }
    });
}


/**
 * Fetches items for the Kitchen Display System (KDS).
 * This finds all individual order items that are not yet marked as READY.
 */
export async function getKitchenDisplayItems(businessUnitId: string) {
  const orderItems = await prismadb.orderItem.findMany({
    where: {
      order: {
        businessUnitId,
        status: 'PREPARING',
      },
      kdsStatus: { not: 'READY' },
    },
    include: {
      order: { include: { user: true, table: true } },
      menuItem: { include: { category: true } },
      modifiers: true,
    },
  });

  // This constructs the "view model" your KDS needs
  return orderItems.map(item => ({
    id: item.id,
    orderItem: item,
    order: item.order,
    prepStation: item.menuItem.category.prepStation,
  }));
}

export async function getBusinessPartners() {
    // Note: In a real app, you'd want to paginate this
    return prismadb.businessPartner.findMany({
        orderBy: { name: 'asc' }
    });
}

/**
 * Fetches inventory items that are at or below their reorder point.
 */
export async function getInventoryAlerts(businessUnitId: string) {
  const lowStockLevels = await prismadb.inventoryStock.findMany({
    where: {
      location: { businessUnitId },
      // The core logic: quantity is less than or equal to the reorder point
      quantityOnHand: {
        lte: prismadb.inventoryStock.fields.reorderPoint,
      },
      reorderPoint: {
        gt: 0 // Only show alerts for items that have a reorder point set
      }
    },
    include: {
      inventoryItem: true,
    },
  });

  return lowStockLevels.map(stock => ({
    id: stock.id,
    itemName: stock.inventoryItem.name,
    currentStock: stock.quantityOnHand,
    reorderPoint: stock.reorderPoint,
    // You can add more complex logic for severity if needed
    severity: stock.quantityOnHand === 0 ? 'CRITICAL' : 'LOW',
  }));
}

/**
 * Fetches and calculates key sales metrics for a given period (e.g., today).
 */
export async function getSalesMetrics(businessUnitId: string) {
  const today = startOfDay(new Date());

  const paidOrdersToday = await prismadb.order.findMany({
    where: {
      businessUnitId,
      isPaid: true,
      createdAt: { gte: today },
    },
  });

  const totalSales = paidOrdersToday.reduce((sum, order) => sum + order.totalAmount, 0);
  const totalOrders = paidOrdersToday.length;
  const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

  // For top selling items, we need to aggregate across all OrderItems for the day
  const orderItemsToday = await prismadb.orderItem.findMany({
    where: { order: { id: { in: paidOrdersToday.map(o => o.id) } } },
    include: { menuItem: true }
  });

  const productSalesCount: { [key: string]: { item: any, quantity: number, revenue: number } } = {};
  orderItemsToday.forEach(item => {
    if (!productSalesCount[item.menuItem.name]) {
        productSalesCount[item.menuItem.name] = { item: item.menuItem, quantity: 0, revenue: 0 };
    }
    productSalesCount[item.menuItem.name].quantity += item.quantity;
    productSalesCount[item.menuItem.name].revenue += item.priceAtSale * item.quantity;
  });

  const topSellingItems = Object.values(productSalesCount)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 3); // Get top 3

  return {
    totalSales,
    totalOrders,
    averageOrderValue,
    topSellingItems
    // Hourly breakdown would require more complex grouping in JS
  };
}

export async function getDiscounts(businessUnitId: string) {
  return prismadb.discount.findMany({
    where: {
      businessUnitId,
      isActive: true,
    }
  });
}

export async function getActiveShift(userId: string, terminalId: string) {
    return prismadb.shift.findFirst({
        where: {
            userId,
            terminalId,
            endedAt: null, // An active shift is one that has not ended
        },
        include: { user: true, terminal: true }
    });
}

export async function getMenuCategories(businessUnitId: string) {
  return prismadb.menuCategory.findMany({
    where: { 
      businessUnitId,
      isActive: true,
    },
    orderBy: { name: 'asc' }, // Or you can add a `sortOrder` field to your model
  });
}

export async function getActiveTableCount(businessUnitId: string) {
  return prismadb.table.count({
    where: {
      businessUnitId,
      status: TableStatus.OCCUPIED, // Assuming you have a status field
    },
  });
}

export async function getTablesWithActiveOrders(businessUnitId: string) {
  const tables = await prismadb.table.findMany({
    where: { businessUnitId,  },
    include: {
      orders: {
        where: { status: { notIn: ['PAID', 'CANCELLED'] } },
        include: {
          user: true, // The server assigned to the order
          items: {
            include: {
              menuItem: true,
              modifiers: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      },
    },
    orderBy: { name: 'asc' },
  });

  // This maps the data into the shape our UI components will expect.
  return tables.map(table => {
    const currentOrder = table.orders[0] || null; // A table has at most one active order
    return {
      ...table,
      currentOrder,
    };
  });
}