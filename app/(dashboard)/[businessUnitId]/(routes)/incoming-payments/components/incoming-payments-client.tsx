"use client";

import { Plus, Download, DollarSign, TrendingUp } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { columns, IncomingPaymentColumn } from "./incoming-payments-columns";
import { formatter } from "@/lib/utils";

interface IncomingPaymentsClientProps {
  data: IncomingPaymentColumn[];
}

export const IncomingPaymentsClient: React.FC<IncomingPaymentsClientProps> = ({ data }) => {
  const params = useParams();
  const router = useRouter();
  
  const [searchTerm, setSearchTerm] = useState("");

  const filteredData = useMemo(() => {
    return data.filter((payment) => {
      const searchContent = `${payment.docNum} ${payment.customerName}`.toLowerCase();
      return searchContent.includes(searchTerm.toLowerCase());
    });
  }, [data, searchTerm]);

  const summaryStats = useMemo(() => {
    const totalAmount = data.reduce((sum, payment) => sum + parseFloat(payment.amount.replace(/[^0-9.-]/g, '')), 0);
    const todayPayments = data.filter(payment => {
      const paymentDate = new Date(payment.paymentDate);
      const today = new Date();
      return paymentDate.toDateString() === today.toDateString();
    });
    const todayAmount = todayPayments.reduce((sum, payment) => sum + parseFloat(payment.amount.replace(/[^0-9.-]/g, '')), 0);

    return { totalAmount, todayAmount, todayCount: todayPayments.length };
  }, [data]);

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading 
          title={`Incoming Payments (${filteredData.length})`} 
          description="Track customer payments and cash receipts" 
        />
        <div className="flex items-center gap-2">
          <Button onClick={() => router.push(`/${params.businessUnitId}/incoming-payments/reports`)} variant="outline">
            <TrendingUp className="mr-2 h-4 w-4" />
            Reports
          </Button>
          <Button onClick={() => router.push(`/${params.businessUnitId}/incoming-payments/new`)}>
            <Plus className="mr-2 h-4 w-4" />
            Record Payment
          </Button>
        </div>
      </div>
      <Separator />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatter.format(summaryStats.totalAmount)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Receipts</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatter.format(summaryStats.todayAmount)}</div>
            <p className="text-xs text-muted-foreground">{summaryStats.todayCount} payments</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Payment</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatter.format(data.length > 0 ? summaryStats.totalAmount / data.length : 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search payments..."
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

      <DataTable searchKey="docNum" columns={columns} data={filteredData} />
    </>
  );
};