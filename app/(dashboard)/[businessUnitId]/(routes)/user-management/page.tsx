import prismadb from "@/lib/db";
import { UserManagementClient } from "./components/client";
import { UserManagementColumn } from "./components/columns";

export default async function UserManagementPage({
  params
}: {
  params: Promise<{ businessUnitId: string }>;
}) {
  // ✅ Await params for Next.js 14+
  const { businessUnitId } = await params;

  // Fetch all user assignments for the current business unit
  const assignments = await prismadb.userBusinessUnit.findMany({
    where: {
      businessUnitId
    },
    include: {
      user: true,
      role: true,
    },
    orderBy: {
      user: {
        name: 'asc'
      }
    }
  });

  // Fetch all available roles to pass to the modal
  const roles = await prismadb.roles.findMany();

  const formattedAssignments: UserManagementColumn[] = assignments.map((item) => ({
    userId: item.userId,
    name: item.user.name,
    username: item.user.username,
    role: item.role.role,
    roleId: item.roleId,
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <UserManagementClient data={formattedAssignments} roles={roles} />
      </div>
    </div>
  );
}
