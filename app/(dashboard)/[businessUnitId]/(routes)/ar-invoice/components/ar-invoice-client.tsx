"use client";

import { Plus, Filter, Download, FileText, DollarSign } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { columns, ARInvoiceColumn } from "./ar-invoice-columns";
import { formatter } from "@/lib/utils";

interface ARInvoiceClientProps {
  data: ARInvoiceColumn[];
}

export const ARInvoiceClient: React.FC<ARInvoiceClientProps> = ({ data }) => {
  const params = useParams();
  const router = useRouter();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [overdueFilter, setOverdueFilter] = useState<string>("all");

  const filteredData = useMemo(() => {
    return data.filter((invoice) => {
      const searchContent = `${invoice.docNum} ${invoice.customerName}`.toLowerCase();
      const matchesSearch = searchContent.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
      const matchesOverdue = overdueFilter === "all" || 
        (overdueFilter === "overdue" && invoice.overdue) ||
        (overdueFilter === "current" && !invoice.overdue);
      
      return matchesSearch && matchesStatus && matchesOverdue;
    });
  }, [data, searchTerm, statusFilter, overdueFilter]);

  const summaryStats = useMemo(() => {
    const totalAmount = data.reduce((sum, inv) => sum + parseFloat(inv.totalAmount.replace(/[^0-9.-]/g, '')), 0);
    const totalPaid = data.reduce((sum, inv) => sum + parseFloat(inv.amountPaid.replace(/[^0-9.-]/g, '')), 0);
    const totalBalance = data.reduce((sum, inv) => sum + parseFloat(inv.balance.replace(/[^0-9.-]/g, '')), 0);
    const overdueCount = data.filter(inv => inv.overdue).length;

    return { totalAmount, totalPaid, totalBalance, overdueCount };
  }, [data]);

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading 
          title={`Accounts Receivable (${filteredData.length})`} 
          description="Manage customer invoices and track outstanding receivables" 
        />
        <div className="flex items-center gap-2">
          <Button onClick={() => router.push(`/${params.businessUnitId}/ar-invoice/reports`)} variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Reports
          </Button>
          <Button onClick={() => router.push(`/${params.businessUnitId}/ar-invoice/new`)}>
            <Plus className="mr-2 h-4 w-4" />
            New Invoice
          </Button>
        </div>
      </div>
      <Separator />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatter.format(summaryStats.totalAmount)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatter.format(summaryStats.totalPaid)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatter.format(summaryStats.totalBalance)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <FileText className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summaryStats.overdueCount}</div>
            <p className="text-xs text-muted-foreground">invoices</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={overdueFilter} onValueChange={setOverdueFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Due Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="current">Current</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      <DataTable searchKey="docNum" columns={columns} data={filteredData} />
    </>
  );
};