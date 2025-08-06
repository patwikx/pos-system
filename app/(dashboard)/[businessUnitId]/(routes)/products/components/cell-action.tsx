// /components/cell-action.tsx

"use client";

import axios from "axios";
import { CircleArrowDown, Copy, Edit, MoreHorizontal, Trash, CircleArrowUp } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { AlertModal } from "@/components/modals/alert-modal";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

import { ProductColumn } from "./columns";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/lib/auth";

interface CellActionProps {
  data: ProductColumn;
}

export const CellAction: React.FC<CellActionProps> = ({
  data,
}) => {
  const [loading, setLoading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  // --- NEW STATE for the archive confirmation dialog ---
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);

  const router = useRouter();
  const params = useParams();
  const user = useCurrentUser();
  const { toast } = useToast();

  const isArchived = data.isArchived;

  // Function to handle toggling the archived status
  const onToggleArchive = async () => {
    try {
      setLoading(true);
      await axios.patch(`/api/${params.storeId}/products/${data.id}`, {
        isArchived: !isArchived,
      });
      toast({
        title: `Product ${isArchived ? "Activated" : "Deactivated"}`,
        description: `The product has been ${isArchived ? "activated" : "deactivated"} successfully.`,
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      // --- Close the archive modal after the action is complete ---
      setArchiveModalOpen(false);
    }
  };

  const onConfirmDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/${params.storeId}/products/${data.id}`);
      toast({
        title: "Product Deleted",
        description: "The product has been deleted successfully.",
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setDeleteModalOpen(false);
    }
  };

  const onCopy = (barCode: string) => {
    navigator.clipboard.writeText(barCode);
    toast({
      title: "Product",
      description: "The product barcode has been copied to clipboard.",
    });
  }

  return (
    <>
      {/* Delete Confirmation Modal */}
      <AlertModal 
        isOpen={deleteModalOpen} 
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={onConfirmDelete}
        loading={loading}
      />
      {/* --- NEW Archive/Deactivate Confirmation Modal --- */}
      <AlertModal 
        isOpen={archiveModalOpen} 
        onClose={() => setArchiveModalOpen(false)}
        onConfirm={onToggleArchive}
        loading={loading}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0" disabled={loading}>
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onCopy(data.barCode)}>
            <Copy className="mr-2 h-4 w-4" /> Copy Barcode
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              if (user?.role !== "Administrator" && user?.role !== "Acctg") {
                toast({
                  title: "Unauthorized",
                  description: "You are not authorized to update this product.",
                  variant: "destructive",
                });
                return;
              }
              router.push(`/${params.storeId}/products/${data.id}`);
            }}
          >
            <Edit className="mr-2 h-4 w-4" /> Update
          </DropdownMenuItem>
          
          {/* --- MODIFIED DEACTIVATE BUTTON to open the dialog --- */}
          <DropdownMenuItem
            onClick={() => {
              if (user?.role !== "Administrator" && user?.role !== "Acctg") {
                  toast({
                      title: "Unauthorized",
                      description: "You are not authorized to perform this action.",
                      variant: "destructive",
                  });
                  return;
              }
              // --- This now opens the dialog instead of calling the function directly ---
              setArchiveModalOpen(true);
            }}
          >
            {isArchived ? (
              <CircleArrowUp className="mr-2 h-4 w-4" />
            ) : (
              <CircleArrowDown className="mr-2 h-4 w-4" />
            )}
            {isArchived ? "Activate" : "Deactivate"}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => {
              if (user?.role !== "Administrator" && user?.role !== "Acctg") {
                toast({
                  title: "Unauthorized",
                  description: "You are not authorized to delete this product.",
                  variant: "destructive",
                });
                return;
              }
              setDeleteModalOpen(true);
            }}
          >
            <Trash className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};