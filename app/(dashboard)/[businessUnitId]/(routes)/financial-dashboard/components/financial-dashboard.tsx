"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  CreditCard, 
  Building2,
  Users,
  Calendar,
  FileText,
  Download,
  RefreshCw
} from "lucide-react";
import { FinancialDashboardData } from "@/types/financials-types";
import { formatter } from "@/lib/utils";
import { FinancialChart } from "./financial-chart";
import { TopPartnersTable } from "./top-partners-chart";
import { AgingAnalysisChart } from "./aging-analysis-chart";


interface FinancialDashboardClientProps {
  data: FinancialDashboardData;
}

export function FinancialDashboardClient({ data }: FinancialDashboardClientProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('current-month');

  const kpiCards = [
    {
      title: "Total Revenue",
      value: data.totalRevenue,
      icon: DollarSign,
      trend: "+12.5%",
      trendDirection: "up" as const,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Total Expenses", 
      value: data.totalExpenses,
      icon: CreditCard,
      trend: "+8.2%",
      trendDirection: "up" as const,
      color: "text-red-600",
      bgColor: "bg-red-50"
    },
    {
      title: "Net Income",
      value: data.netIncome,
      icon: TrendingUp,
      trend: data.netIncome > 0 ? "+15.3%" : "-5.2%",
      trendDirection: data.netIncome > 0 ? "up" : "down",
      color: data.netIncome > 0 ? "text-green-600" : "text-red-600",
      bgColor: data.netIncome > 0 ? "bg-green-50" : "bg-red-50"
    },
    {
      title: "Cash Flow",
      value: data.cashFlow,
      icon: Wallet,
      trend: "+5.7%",
      trendDirection: "up" as const,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Accounts Receivable",
      value: data.accountsReceivable,
      icon: Users,
      trend: "-2.1%",
      trendDirection: "down" as const,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    },
    {
      title: "Accounts Payable",
      value: data.accountsPayable,
      icon: Building2,
      trend: "+3.4%",
      trendDirection: "up" as const,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your financial performance and key metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {kpiCards.map((kpi, index) => (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatter.format(kpi.value)}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {kpi.trendDirection === "up" ? (
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                )}
                <span className={kpi.trendDirection === "up" ? "text-green-600" : "text-red-600"}>
                  {kpi.trend}
                </span>
                <span className="ml-1">from last month</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="receivables">Receivables</TabsTrigger>
          <TabsTrigger value="payables">Payables</TabsTrigger>
          <TabsTrigger value="cash-flow">Cash Flow</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <FinancialChart
                  data={data.monthlyRevenue.map((item, index) => ({
                    month: item.month,
                    revenue: item.amount,
                    expenses: data.monthlyExpenses[index]?.amount || 0
                  }))}
                  type="revenue-expenses"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <TopPartnersTable data={data.topCustomers} type="customers" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="receivables" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Aging Receivables</CardTitle>
              </CardHeader>
              <CardContent>
                <AgingAnalysisChart data={data.agingReceivables} type="receivables" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>A/R Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Outstanding</span>
                  <span className="text-lg font-bold">{formatter.format(data.accountsReceivable)}</span>
                </div>
                <Separator />
                <div className="space-y-2">
                  {data.agingReceivables.map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{item.period}</span>
                      <span className="text-sm font-medium">{formatter.format(item.amount)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payables" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Aging Payables</CardTitle>
              </CardHeader>
              <CardContent>
                <AgingAnalysisChart data={data.agingPayables} type="payables" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Vendors</CardTitle>
              </CardHeader>
              <CardContent>
                <TopPartnersTable data={data.topVendors} type="vendors" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cash-flow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cash Flow Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{formatter.format(data.cashFlow)}</div>
                  <div className="text-sm text-muted-foreground">Current Cash Position</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{formatter.format(data.totalAssets)}</div>
                  <div className="text-sm text-muted-foreground">Total Assets</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{formatter.format(data.totalLiabilities)}</div>
                  <div className="text-sm text-muted-foreground">Total Liabilities</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}