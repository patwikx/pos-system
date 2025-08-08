"use client";

import { Plus, Download, Building2, CreditCard } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { columns, BankAccountColumn } from "../bank-accounts-columns";
import { formatter } from "@/lib/utils";

interface BankAccountsClientProps {
  data: BankAccountColumn[];
}

export const BankAccountsClient: React.FC<BankAccountsClientProps> = ({ data }) => {
  const params = useParams();
  const router = useRouter();
  
  const [searchTerm, setSearchTerm] = useState("");

  const filteredData = useMemo(() => {
    return data.filter((account) => {
      const searchContent = `${account.name} ${account.bankName} ${account.accountNumber}`.toLowerCase();
      return searchContent.includes(searchTerm.toLowerCase());
    });
  }, [data, searchTerm]);

  const summaryStats = useMemo(() => {
    const totalBalance = data.reduce((sum, acc) => sum + parseFloat(acc.balance.replace(/[^0-9.-]/g, '')), 0);
    const totalTransactions = data.reduce((sum, acc) => sum + acc.transactionCount, 0);

    return { totalBalance, totalTransactions };
  }, [data]);

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading 
          title={`Bank Accounts (${filteredData.length})`} 
          description="Manage your bank accounts and monitor cash positions" 
        />
        <div className="flex items-center gap-2">
          <Button onClick={() => router.push(`/${params.businessUnitId}/bank-accounts/reconciliation`)} variant="outline">
            <CreditCard className="mr-2 h-4 w-4" />
            Reconciliation
          </Button>
          <Button onClick={() => router.push(`/${params.businessUnitId}/bank-accounts/new`)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Account
          </Button>
        </div>
      </div>
      <Separator />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <CreditCard className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatter.format(summaryStats.totalBalance)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{summaryStats.totalTransactions}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search accounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      <DataTable searchKey="name" columns={columns} data={filteredData} />
    </>
  );
};