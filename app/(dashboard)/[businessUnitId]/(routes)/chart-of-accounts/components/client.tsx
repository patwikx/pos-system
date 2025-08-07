"use client";

import { Plus, Filter, Download } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

import { columns, GlAccountColumn } from "./columns";
import { AccountType } from "@prisma/client";

interface ChartOfAccountsClientProps {
  data: GlAccountColumn[];
  accountTypes: AccountType[];
}

export const ChartOfAccountsClient: React.FC<ChartOfAccountsClientProps> = ({ 
  data, 
  accountTypes 
}) => {
  const params = useParams();
  const router = useRouter();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>("all");
  const [showOnlyWithBalance, setShowOnlyWithBalance] = useState(false);

  const filteredData = useMemo(() => {
    return data.filter((account) => {
      const searchContent = `${account.accountCode} ${account.name}`.toLowerCase();
      const matchesSearch = searchContent.includes(searchTerm.toLowerCase());
      const matchesType = accountTypeFilter === "all" || account.accountType === accountTypeFilter;
      const matchesBalance = !showOnlyWithBalance || parseFloat(account.balance.replace(/[^0-9.-]/g, '')) !== 0;
      
      return matchesSearch && matchesType && matchesBalance;
    });
  }, [data, searchTerm, accountTypeFilter, showOnlyWithBalance]);

  const exportToCSV = () => {
    const csvContent = [
      ['Account Code', 'Account Name', 'Account Type', 'Balance', 'Transactions'].join(','),
      ...filteredData.map(account => [
        account.accountCode,
        `"${account.name}"`,
        account.accountType,
        account.balance.replace(/[^0-9.-]/g, ''),
        account.transactionCount
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chart-of-accounts.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading 
          title={`Chart of Accounts (${filteredData.length})`} 
          description="Manage your general ledger accounts and account structure" 
        />
        <div className="flex items-center gap-2">
          <Button onClick={exportToCSV} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => router.push(`/${params.businessUnitId}/chart-of-accounts/new`)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Account
          </Button>
        </div>
      </div>
      <Separator />
      
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
            <Select value={accountTypeFilter} onValueChange={setAccountTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {accountTypes.map((type) => (
                  <SelectItem key={type.id} value={type.name}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-balance"
                checked={showOnlyWithBalance}
                onCheckedChange={(checked) => setShowOnlyWithBalance(!!checked)}
              />
              <Label htmlFor="show-balance" className="cursor-pointer whitespace-nowrap">
                Show only accounts with balance
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <DataTable searchKey="name" columns={columns} data={filteredData} />
    </>
  );
};