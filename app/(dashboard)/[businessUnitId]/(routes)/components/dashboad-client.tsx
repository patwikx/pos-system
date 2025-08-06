"use client";

import { DollarSign, CreditCard, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { formatter } from "@/lib/utils";
import Overview from "@/components/graph-overview";
import { TopSellingItems } from "@/components/top-selling-items";

// Define a type for the data prop
interface DashboardData {
  totalRevenue: number;
  salesCount: number;
  averageSaleValue: number;
  todayRevenue: number;
  topSellingItems: { name: string; count: number }[];
  graphRevenue: { name: string; total: number }[];
}

interface DashboardClientProps {
  data: DashboardData;
}

export const DashboardClient: React.FC<DashboardClientProps> = ({ data }) => {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <Heading title="Performance Dashboard" description="Sales and performance overview of your business unit" />
      <Separator />
      {/* --- TOP ROW CARDS --- */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatter.format(data.todayRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatter.format(data.totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{data.salesCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Sale Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatter.format(data.averageSaleValue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
        <Card className="col-span-1 lg:col-span-4">
          <CardHeader>
            <CardTitle>Monthly Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <Overview data={data.graphRevenue} />
          </CardContent>
        </Card>
        <Card className="col-span-1 lg:col-span-3">
          <CardHeader>
            <CardTitle>Top Selling Items</CardTitle>
          </CardHeader>
          <CardContent>
            <TopSellingItems items={data.topSellingItems} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};