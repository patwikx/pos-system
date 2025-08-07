"use client";

import axios from "axios";
import { useState } from "react";
import { Copy, Edit, MoreHorizontal, Trash, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { AlertModal } from "@/components/modals/alert-modal";
import { GlAccountColumn } from "./columns";

interface CellActionProps {
  data: GlAccountColumn;
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
  const router = useRouter();
  const params = useParams();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const onConfirm = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/${params.businessUnitId}/chart-of-accounts/${data.id}`);
      toast.success('Account deleted.');
      router.refresh();
    } catch (error: any) {
      toast.error(error.response?.data || 'Something went wrong.');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  const onCopy = (accountCode: string) => {
    navigator.clipboard.writeText(accountCode);
    toast.success('Account code copied to clipboard.');
  }

  return (
    <>
      <AlertModal 
        isOpen={open} 
        onClose={() => setOpen(false)}
        onConfirm={onConfirm}
        loading={loading}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onCopy(data.accountCode)}>
            <Copy className="mr-2 h-4 w-4" /> Copy Code
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push(`/${params.businessUnitId}/chart-of-accounts/${data.id}`)}
          >
            <Edit className="mr-2 h-4 w-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push(`/${params.businessUnitId}/chart-of-accounts/${data.id}/transactions`)}
          >
            <TrendingUp className="mr-2 h-4 w-4" /> View Transactions
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setOpen(true)}
            className="text-red-600 focus:text-red-700 focus:bg-red-100"
          >
            <Trash className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};