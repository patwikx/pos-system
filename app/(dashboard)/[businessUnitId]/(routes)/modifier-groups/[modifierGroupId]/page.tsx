import prismadb from "@/lib/db";
import { headers } from "next/headers";
import { ModifierGroupForm } from "./components/modifier-group-form";

const ModifierGroupPage = async () => {
  // We use the headers workaround to get the ID from the URL
  const headersList = await headers();
  const pathname = headersList.get("next-url") || "";
  const modifierGroupId = pathname.split('/').pop();

  // A safety check
  if (!modifierGroupId) {
    return <div className="p-8">Error: Could not identify the Modifier Group ID.</div>;
  }

  // Fetch the specific modifier group to edit.
  // If the ID is "new", this query will correctly return `null`.
  const modifierGroup = await prismadb.modifierGroup.findUnique({
    where: {
      id: modifierGroupId,
    }
  });

  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <ModifierGroupForm initialData={modifierGroup} />
      </div>
    </div>
  );
}

export default ModifierGroupPage;