"use client";

import { useState, useEffect } from "react";
import { Download, FileText, TrendingUp, DollarSign, Calculator } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import { generateTrialBalance, generateFinancialReports } from "@/lib/actions/acctg-actions";
import { TrialBalanceItem, FinancialReportData } from "@/types/acctg-types";
import { formatter } from "@/lib/utils";

interface FinancialReportsClientProps {
  businessUnitId: string;
}

export const FinancialReportsClient: React.FC<FinancialReportsClientProps> = ({ 
  businessUnitId 
}) => {
  const [trialBalance, setTrialBalance] = useState<TrialBalanceItem[]>([]);
  const [financialData, setFinancialData] = useState<FinancialReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReports = async () => {
      setLoading(true);
      try {
        const [trialBalanceData, financialReportData] = await Promise.all([
          generateTrialBalance(businessUnitId),
          generateFinancialReports(businessUnitId)
        ]);
        
        setTrialBalance(trialBalanceData);
        setFinancialData(financialReportData);
      } catch (error) {
        console.error('Error loading financial reports:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, [businessUnitId]);

  const exportTrialBalance = () => {
    const csvContent = [
      ['Account Code', 'Account Name', 'Account Type', 'Debit Balance', 'Credit Balance'].join(','),
      ...trialBalance.map(item => [
        item.accountCode,
        `"${item.accountName}"`,
        item.accountType,
        item.debitBalance.toFixed(2),
        item.creditBalance.toFixed(2)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trial-balance.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportBalanceSheet = () => {
    if (!financialData) return;
    
    const csvContent = [
      ['BALANCE SHEET'],
      [''],
      ['ASSETS'],
      ['Account Code', 'Account Name', 'Amount'].join(','),
      ...financialData.assets.map(item => [
        item.accountCode,
        `"${item.accountName}"`,
        item.balance.toFixed(2)
      ].join(',')),
      ['', 'Total Assets', financialData.totalAssets.toFixed(2)],
      [''],
      ['LIABILITIES'],
      ['Account Code', 'Account Name', 'Amount'].join(','),
      ...financialData.liabilities.map(item => [
        item.accountCode,
        `"${item.accountName}"`,
        item.balance.toFixed(2)
      ].join(',')),
      ['', 'Total Liabilities', financialData.totalLiabilities.toFixed(2)],
      [''],
      ['EQUITY'],
      ['Account Code', 'Account Name', 'Amount'].join(','),
      ...financialData.equity.map(item => [
        item.accountCode,
        `"${item.accountName}"`,
        item.balance.toFixed(2)
      ].join(',')),
      ['', 'Total Equity', financialData.totalEquity.toFixed(2)]
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'balance-sheet.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Calculator className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Generating financial reports...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading 
          title="Financial Reports" 
          description="View trial balance, balance sheet, and income statement" 
        />
      </div>
      <Separator />

      <Tabs defaultValue="trial-balance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
          <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
          <TabsTrigger value="income-statement">Income Statement</TabsTrigger>
        </TabsList>

        <TabsContent value="trial-balance" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Trial Balance
              </CardTitle>
              <Button onClick={exportTrialBalance} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account Code</TableHead>
                      <TableHead>Account Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Debit Balance</TableHead>
                      <TableHead className="text-right">Credit Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trialBalance.map((item) => (
                      <TableRow key={item.accountCode}>
                        <TableCell className="font-mono">{item.accountCode}</TableCell>
                        <TableCell className="font-medium">{item.accountName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.accountType}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {item.debitBalance > 0 ? formatter.format(item.debitBalance) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {item.creditBalance > 0 ? formatter.format(item.creditBalance) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2 font-semibold bg-muted/50">
                      <TableCell colSpan={3}>TOTALS</TableCell>
                      <TableCell className="text-right">
                        {formatter.format(trialBalance.reduce((sum, item) => sum + item.debitBalance, 0))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatter.format(trialBalance.reduce((sum, item) => sum + item.creditBalance, 0))}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balance-sheet" className="space-y-4">
          {financialData && (
            <div className="grid gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Balance Sheet
                  </CardTitle>
                  <Button onClick={exportBalanceSheet} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Assets */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-blue-600">ASSETS</h3>
                      <div className="space-y-2">
                        {financialData.assets.map((asset) => (
                          <div key={asset.accountCode} className="flex justify-between py-1">
                            <span className="text-sm">{asset.accountCode} - {asset.accountName}</span>
                            <span className="font-mono text-sm">{formatter.format(asset.balance)}</span>
                          </div>
                        ))}
                        <Separator />
                        <div className="flex justify-between font-semibold text-blue-600">
                          <span>Total Assets</span>
                          <span className="font-mono">{formatter.format(financialData.totalAssets)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Liabilities & Equity */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-red-600">LIABILITIES</h3>
                      <div className="space-y-2 mb-6">
                        {financialData.liabilities.map((liability) => (
                          <div key={liability.accountCode} className="flex justify-between py-1">
                            <span className="text-sm">{liability.accountCode} - {liability.accountName}</span>
                            <span className="font-mono text-sm">{formatter.format(liability.balance)}</span>
                          </div>
                        ))}
                        <Separator />
                        <div className="flex justify-between font-semibold text-red-600">
                          <span>Total Liabilities</span>
                          <span className="font-mono">{formatter.format(financialData.totalLiabilities)}</span>
                        </div>
                      </div>

                      <h3 className="text-lg font-semibold mb-4 text-green-600">EQUITY</h3>
                      <div className="space-y-2">
                        {financialData.equity.map((equity) => (
                          <div key={equity.accountCode} className="flex justify-between py-1">
                            <span className="text-sm">{equity.accountCode} - {equity.accountName}</span>
                            <span className="font-mono text-sm">{formatter.format(equity.balance)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between py-1">
                          <span className="text-sm">Retained Earnings</span>
                          <span className="font-mono text-sm">{formatter.format(financialData.netIncome)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-semibold text-green-600">
                          <span>Total Equity</span>
                          <span className="font-mono">{formatter.format(financialData.totalEquity + financialData.netIncome)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="income-statement" className="space-y-4">
          {financialData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Income Statement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Revenue */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-green-600">REVENUE</h3>
                    <div className="space-y-2">
                      {financialData.revenue.map((item) => (
                        <div key={item.accountCode} className="flex justify-between py-1">
                          <span className="text-sm">{item.accountCode} - {item.accountName}</span>
                          <span className="font-mono text-sm">{formatter.format(item.amount)}</span>
                        </div>
                      ))}
                      <Separator />
                      <div className="flex justify-between font-semibold text-green-600">
                        <span>Total Revenue</span>
                        <span className="font-mono">{formatter.format(financialData.totalRevenue)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Expenses */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-red-600">EXPENSES</h3>
                    <div className="space-y-2">
                      {financialData.expenses.map((item) => (
                        <div key={item.accountCode} className="flex justify-between py-1">
                          <span className="text-sm">{item.accountCode} - {item.accountName}</span>
                          <span className="font-mono text-sm">{formatter.format(item.amount)}</span>
                        </div>
                      ))}
                      <Separator />
                      <div className="flex justify-between font-semibold text-red-600">
                        <span>Total Expenses</span>
                        <span className="font-mono">{formatter.format(financialData.totalExpenses)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Net Income */}
                  <div className="border-t-2 pt-4">
                    <div className="flex justify-between text-xl font-bold">
                      <span>Net Income</span>
                      <span className={`font-mono ${financialData.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatter.format(financialData.netIncome)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
};