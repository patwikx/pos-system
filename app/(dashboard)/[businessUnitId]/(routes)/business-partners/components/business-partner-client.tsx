"use client";

import { Plus, Download, Users, Building2, UserCheck } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { columns, BusinessPartnerColumn } from "./business-partner-columns";
import { BusinessPartnerType } from "@prisma/client";

interface BusinessPartnersClientProps {
  data: BusinessPartnerColumn[];
}

export const BusinessPartnersClient: React.FC<BusinessPartnersClientProps> = ({ data }) => {
  const params = useParams();
  const router = useRouter();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filteredData = useMemo(() => {
    return data.filter((partner) => {
      const searchContent = `${partner.bpCode} ${partner.name} ${partner.phone} ${partner.email}`.toLowerCase();
      const matchesSearch = searchContent.includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "all" || partner.type === typeFilter;
      
      return matchesSearch && matchesType;
    });
  }, [data, searchTerm, typeFilter]);

  const summaryStats = useMemo(() => {
    const customers = data.filter(p => p.type === BusinessPartnerType.CUSTOMER).length;
    const vendors = data.filter(p => p.type === BusinessPartnerType.VENDOR).length;
    const leads = data.filter(p => p.type === BusinessPartnerType.LEAD).length;

    return { customers, vendors, leads, total: data.length };
  }, [data]);

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading 
          title={`Business Partners (${filteredData.length})`} 
          description="Manage customers, vendors, and leads" 
        />
        <div className="flex items-center gap-2">
          <Button onClick={() => router.push(`/${params.businessUnitId}/business-partners/reports`)} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => router.push(`/${params.businessUnitId}/business-partners/new`)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Partner
          </Button>
        </div>
      </div>
      <Separator />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Partners</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summaryStats.customers}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendors</CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{summaryStats.vendors}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{summaryStats.leads}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search partners..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value={BusinessPartnerType.CUSTOMER}>Customers</SelectItem>
                <SelectItem value={BusinessPartnerType.VENDOR}>Vendors</SelectItem>
                <SelectItem value={BusinessPartnerType.LEAD}>Leads</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <DataTable searchKey="name" columns={columns} data={filteredData} />
    </>
  );
};