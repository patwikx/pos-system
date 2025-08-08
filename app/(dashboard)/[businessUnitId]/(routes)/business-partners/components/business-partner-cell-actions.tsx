"use client";

import axios from "axios";
import { useState } from "react";
import { Copy, Edit, MoreHorizontal, Trash, Eye, FileText } from "lucide-react";
import { toast } from "sonner";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { AlertModal } from "@/components/modals/alert-modal";
import { BusinessPartnerColumn } from "./business-partner-columns";

interface BusinessPartnerCellActionProps {
  data: BusinessPartnerColumn;
}

export const BusinessPartnerCellAction: React.FC<BusinessPartnerCellActionProps> = ({ data }) => {
  const router = useRouter();
  const params = useParams();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const onConfirm = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/${params.businessUnitId}/business-partners/${data.id}`);
      toast.success('Business partner deleted.');
      router.refresh();
    } catch (error: any) {
      toast.error(error.response?.data || 'Something went wrong.');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  const onCopy = (bpCode: string) => {
    navigator.clipboard.writeText(bpCode);
    toast.success('Business partner code copied to clipboard.');
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
          <DropdownMenuItem onClick={() => onCopy(data.bpCode)}>
            <Copy className="mr-2 h-4 w-4" /> Copy Code
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push(`/${params.businessUnitId}/business-partners/${data.id}`)}
          >
            <Eye className="mr-2 h-4 w-4" /> View Details
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => router.push(`/${params.businessUnitId}/business-partners/${data.id}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push(`/${params.businessUnitId}/business-partners/${data.id}/transactions`)}
          >
            <FileText className="mr-2 h-4 w-4" /> View Transactions
          </DropdownMenuItem>
          <DropdownMenuSeparator />
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