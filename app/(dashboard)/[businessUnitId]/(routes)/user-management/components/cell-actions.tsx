"use client";

import { Edit, MoreHorizontal, Trash } from "lucide-react";
import { useState } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { AlertModal } from "@/components/modals/alert-modal";
import { useUserManagementModal } from "@/hooks/use-user-management-modal";
import { UserManagementColumn } from "./columns";
import { useCurrentUser } from "@/lib/current-user";


interface CellActionProps { data: UserManagementColumn; }

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
  const router = useRouter();
  const params = useParams();
  const { onOpen, roles } = useUserManagementModal();
  const currentUser = useCurrentUser();
  
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // Prevent user from removing themselves from a business unit
  const isCurrentUser = currentUser?.id === data.userId;

  const onConfirm = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/${params.businessUnitId}/user-management/${data.userId}`);
      toast.success('User removed from business unit.');
      router.refresh();
    } catch (error) { toast.error(`Something went wrong. ${error}`); } 
    finally { setLoading(false); setOpen(false); }
  };

  return (
    <>
      <AlertModal isOpen={open} onClose={() => setOpen(false)} onConfirm={onConfirm} loading={loading} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onOpen(roles, data)}>
            <Edit className="mr-2 h-4 w-4" /> Update Role
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpen(true)} disabled={isCurrentUser} className="text-red-600">
            <Trash className="mr-2 h-4 w-4" /> Remove from Unit
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};