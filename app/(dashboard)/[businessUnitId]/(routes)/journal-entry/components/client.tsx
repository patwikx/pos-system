"use client";

import { Plus, FileText, Calendar, Filter } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { columns, JournalEntryColumn } from "../components/columns";


interface JournalEntryClientProps {
  data: JournalEntryColumn[];
}

export const JournalEntryClient: React.FC<JournalEntryClientProps> = ({ data }) => {
  const params = useParams();
  const router = useRouter();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredData = useMemo(() => {
    return data.filter((entry) => {
      const searchContent = `${entry.docNum} ${entry.remarks} ${entry.author}`.toLowerCase();
      const matchesSearch = searchContent.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || entry.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [data, searchTerm, statusFilter]);

  const totalDebits = filteredData.reduce((sum, entry) => {
    return sum + parseFloat(entry.totalDebit.replace(/[^0-9.-]/g, ''));
  }, 0);

  const totalCredits = filteredData.reduce((sum, entry) => {
    return sum + parseFloat(entry.totalCredit.replace(/[^0-9.-]/g, ''));
  }, 0);

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading 
          title={`Journal Entries (${filteredData.length})`} 
          description="Manage manual journal entries and accounting transactions" 
        />
        <Button onClick={() => router.push(`/${params.businessUnitId}/journal-entry/new`)}>
          <Plus className="mr-2 h-4 w-4" />
          New Entry
        </Button>
      </div>
      <Separator />
      
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search entries..."
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
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="font-semibold text-blue-900">Total Entries</div>
              <div className="text-2xl font-bold text-blue-600">{filteredData.length}</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="font-semibold text-green-900">Total Debits</div>
              <div className="text-2xl font-bold text-green-600">₱{totalDebits.toFixed(2)}</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="font-semibold text-purple-900">Total Credits</div>
              <div className="text-2xl font-bold text-purple-600">₱{totalCredits.toFixed(2)}</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="font-semibold text-gray-900">Difference</div>
              <div className={`text-2xl font-bold ${Math.abs(totalDebits - totalCredits) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                ₱{Math.abs(totalDebits - totalCredits).toFixed(2)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <DataTable searchKey="docNum" columns={columns} data={filteredData} />
    </>
  );
};