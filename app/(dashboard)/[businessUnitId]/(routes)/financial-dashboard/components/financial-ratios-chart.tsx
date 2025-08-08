"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { FinancialRatios } from "@/types/financials-types";

interface FinancialRatiosCardProps {
  ratios: FinancialRatios;
}

export function FinancialRatiosCard({ ratios }: FinancialRatiosCardProps) {
  const formatRatio = (value: number, isPercentage: boolean = false) => {
    if (isPercentage) {
      return `${value.toFixed(2)}%`;
    }
    return value.toFixed(2);
  };

  const getRatioStatus = (value: number, good: number, excellent: number) => {
    if (value >= excellent) return { variant: "default" as const, label: "Excellent" };
    if (value >= good) return { variant: "secondary" as const, label: "Good" };
    return { variant: "destructive" as const, label: "Needs Attention" };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Financial Ratios
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="liquidity" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="liquidity">Liquidity</TabsTrigger>
            <TabsTrigger value="profitability">Profitability</TabsTrigger>
            <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
            <TabsTrigger value="leverage">Leverage</TabsTrigger>
          </TabsList>

          <TabsContent value="liquidity" className="space-y-3">
            <div className="grid gap-3">
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Current Ratio</p>
                  <p className="text-sm text-muted-foreground">Current Assets / Current Liabilities</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{formatRatio(ratios.liquidity.currentRatio)}</p>
                  <Badge {...getRatioStatus(ratios.liquidity.currentRatio, 1.2, 2.0)}>
                    {getRatioStatus(ratios.liquidity.currentRatio, 1.2, 2.0).label}
                  </Badge>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Quick Ratio</p>
                  <p className="text-sm text-muted-foreground">(Current Assets - Inventory) / Current Liabilities</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{formatRatio(ratios.liquidity.quickRatio)}</p>
                  <Badge {...getRatioStatus(ratios.liquidity.quickRatio, 1.0, 1.5)}>
                    {getRatioStatus(ratios.liquidity.quickRatio, 1.0, 1.5).label}
                  </Badge>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Cash Ratio</p>
                  <p className="text-sm text-muted-foreground">Cash / Current Liabilities</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{formatRatio(ratios.liquidity.cashRatio)}</p>
                  <Badge {...getRatioStatus(ratios.liquidity.cashRatio, 0.2, 0.5)}>
                    {getRatioStatus(ratios.liquidity.cashRatio, 0.2, 0.5).label}
                  </Badge>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="profitability" className="space-y-3">
            <div className="grid gap-3">
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Gross Profit Margin</p>
                  <p className="text-sm text-muted-foreground">Gross Profit / Revenue</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{formatRatio(ratios.profitability.grossProfitMargin, true)}</p>
                  <Badge {...getRatioStatus(ratios.profitability.grossProfitMargin, 20, 40)}>
                    {getRatioStatus(ratios.profitability.grossProfitMargin, 20, 40).label}
                  </Badge>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Net Profit Margin</p>
                  <p className="text-sm text-muted-foreground">Net Income / Revenue</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{formatRatio(ratios.profitability.netProfitMargin, true)}</p>
                  <Badge {...getRatioStatus(ratios.profitability.netProfitMargin, 10, 20)}>
                    {getRatioStatus(ratios.profitability.netProfitMargin, 10, 20).label}
                  </Badge>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Return on Assets</p>
                  <p className="text-sm text-muted-foreground">Net Income / Total Assets</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{formatRatio(ratios.profitability.returnOnAssets, true)}</p>
                  <Badge {...getRatioStatus(ratios.profitability.returnOnAssets, 5, 15)}>
                    {getRatioStatus(ratios.profitability.returnOnAssets, 5, 15).label}
                  </Badge>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Return on Equity</p>
                  <p className="text-sm text-muted-foreground">Net Income / Total Equity</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{formatRatio(ratios.profitability.returnOnEquity, true)}</p>
                  <Badge {...getRatioStatus(ratios.profitability.returnOnEquity, 10, 20)}>
                    {getRatioStatus(ratios.profitability.returnOnEquity, 10, 20).label}
                  </Badge>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="efficiency" className="space-y-3">
            <div className="grid gap-3">
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Asset Turnover</p>
                  <p className="text-sm text-muted-foreground">Revenue / Total Assets</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{formatRatio(ratios.efficiency.assetTurnover)}</p>
                  <Badge {...getRatioStatus(ratios.efficiency.assetTurnover, 1.0, 2.0)}>
                    {getRatioStatus(ratios.efficiency.assetTurnover, 1.0, 2.0).label}
                  </Badge>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Receivables Turnover</p>
                  <p className="text-sm text-muted-foreground">Revenue / Avg Receivables</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{formatRatio(ratios.efficiency.receivablesTurnover)}</p>
                  <Badge variant="outline">N/A</Badge>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Payables Turnover</p>
                  <p className="text-sm text-muted-foreground">COGS / Avg Payables</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{formatRatio(ratios.efficiency.payablesTurnover)}</p>
                  <Badge variant="outline">N/A</Badge>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="leverage" className="space-y-3">
            <div className="grid gap-3">
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Debt-to-Equity</p>
                  <p className="text-sm text-muted-foreground">Total Debt / Total Equity</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{formatRatio(ratios.leverage.debtToEquity)}</p>
                  <Badge {...getRatioStatus(1 / ratios.leverage.debtToEquity, 2, 4)}>
                    {ratios.leverage.debtToEquity < 0.5 ? "Excellent" : ratios.leverage.debtToEquity < 1 ? "Good" : "High Risk"}
                  </Badge>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Debt-to-Assets</p>
                  <p className="text-sm text-muted-foreground">Total Debt / Total Assets</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{formatRatio(ratios.leverage.debtToAssets, true)}</p>
                  <Badge {...getRatioStatus(1 / ratios.leverage.debtToAssets, 2, 3)}>
                    {ratios.leverage.debtToAssets < 0.3 ? "Excellent" : ratios.leverage.debtToAssets < 0.6 ? "Good" : "High Risk"}
                  </Badge>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}