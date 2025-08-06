// lib/actions/get-dashboard-data.ts (Corrected)

import prismadb from "@/lib/db";

interface GraphData {
  name: string;
  total: number;
}

interface TopProduct {
    name: string;
    count: number;
}

export const getDashboardData = async (businessUnitId: string) => {
  // --- Basic Sales and Revenue ---
  // CORRECTED: Using `prismadb.order` instead of `prismadb.sale`
  const paidOrders = await prismadb.order.findMany({
    where: {
      businessUnitId,
      isPaid: true,
    },
  });

  const totalRevenue = paidOrders.reduce((total, order) => total + order.totalAmount, 0);
  const salesCount = paidOrders.length;
  const averageSaleValue = salesCount > 0 ? totalRevenue / salesCount : 0;

  // --- Today's Revenue ---
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today

  // CORRECTED: Using `prismadb.order`
  const todaysPaidOrders = await prismadb.order.findMany({
    where: {
        businessUnitId,
        isPaid: true,
        createdAt: {
            gte: today
        }
    }
  });

  const todayRevenue = todaysPaidOrders.reduce((total, order) => total + order.totalAmount, 0);

  // --- Top Selling Items ---
  // This query remains correct as it filters through the 'order' relation
  const orderItems = await prismadb.orderItem.findMany({
    where: {
        order: {
            businessUnitId: businessUnitId,
            isPaid: true,
        }
    },
    include: {
        menuItem: {
            select: { name: true }
        }
    }
  });

  const productSalesCount: { [key: string]: number } = {};
  orderItems.forEach(item => {
    productSalesCount[item.menuItem.name] = (productSalesCount[item.menuItem.name] || 0) + item.quantity;
  });
  
  const topSellingItems: TopProduct[] = Object.entries(productSalesCount)
    .sort(([, countA], [, countB]) => countB - countA)
    .slice(0, 5) // Get the top 5 items
    .map(([name, count]) => ({ name, count }));

  // --- Graph Data ---
  const monthlyRevenue: { [key: number]: number } = {};
  // CORRECTED: Looping through `paidOrders`
  for (const order of paidOrders) {
    const month = order.createdAt.getMonth();
    monthlyRevenue[month] = (monthlyRevenue[month] || 0) + order.totalAmount;
  }

  const graphRevenue: GraphData[] = [
    { name: "Jan", total: 0 }, { name: "Feb", total: 0 }, { name: "Mar", total: 0 },
    { name: "Apr", total: 0 }, { name: "May", total: 0 }, { name: "Jun", total: 0 },
    { name: "Jul", total: 0 }, { name: "Aug", total: 0 }, { name: "Sep", total: 0 },
    { name: "Oct", total: 0 }, { name: "Nov", total: 0 }, { name: "Dec", total: 0 },
  ];

  for (const month in monthlyRevenue) {
    graphRevenue[parseInt(month)].total = monthlyRevenue[parseInt(month)];
  }

  return {
    totalRevenue,
    salesCount,
    averageSaleValue,
    todayRevenue,
    topSellingItems,
    graphRevenue,
  };
};