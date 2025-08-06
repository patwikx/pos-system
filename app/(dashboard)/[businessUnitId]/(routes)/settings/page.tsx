import { redirect } from "next/navigation";
import { auth } from "@/auth";
import prismadb from "@/lib/db";

import { SettingsForm } from "./components/settings-form";

export default async function SettingsPage({
  params
}: {
  params: Promise<{ businessUnitId: string }>;
}) {
  // ✅ Await params for Next.js 14+
  const { businessUnitId } = await params;

  const session = await auth();
  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  const businessUnit = await prismadb.businessUnit.findFirst({
    where: {
      id: businessUnitId,
      // Ensure the user is assigned to this business unit
      userAssignments: {
        some: {
          userId: session.user.id,
        }
      }
    }
  });

  if (!businessUnit) {
    // If the unit doesn't exist or the user isn't assigned, redirect them.
    // The root layout will handle finding their default unit.
    redirect('/');
  }

  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <SettingsForm initialData={businessUnit} />
      </div>
    </div>
  );
}
