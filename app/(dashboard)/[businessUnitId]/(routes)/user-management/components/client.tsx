"use client";

import { Plus } from "lucide-react";
import { Roles } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { useUserManagementModal } from "@/hooks/use-user-management-modal";
import { UserManagementModal } from "@/components/modals/user-management-modal";

import { columns, UserManagementColumn } from "./columns";

interface UserManagementClientProps {
  data: UserManagementColumn[];
  roles: Roles[];
}

export const UserManagementClient: React.FC<UserManagementClientProps> = ({ data, roles }) => {
  const { onOpen } = useUserManagementModal();

  return (
    <>
      <UserManagementModal />
      <div className="flex items-center justify-between">
        <Heading title={`Users (${data.length})`} description="Manage users assigned to this business unit" />
        <Button onClick={() => onOpen(roles)}>
          <Plus className="mr-2 h-4 w-4" /> Assign User
        </Button>
      </div>
      <Separator />
      <DataTable searchKey="name" columns={columns} data={data} />
    </>
  );
};