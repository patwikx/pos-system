"use client";

import { Plus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { AccountingPeriodColumn, columns } from "./columns";

interface AccountingPeriodsClientProps { data: AccountingPeriodColumn[]; }

export const AccountingPeriodsClient: React.FC<AccountingPeriodsClientProps> = ({ data }) => {
  const params = useParams();
  const router = useRouter();

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading title={`Accounting Periods (${data.length})`} description="Manage financial periods for closing your books" />
        <Button onClick={() => router.push(`/${params.businessUnitId}/accounting-periods/new`)}>
          <Plus className="mr-2 h-4 w-4" /> Add New
        </Button>
      </div>
      <Separator />
      <DataTable searchKey="name" columns={columns} data={data} />
    </>
  );
};