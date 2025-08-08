import { headers } from 'next/headers';
import prismadb from "@/lib/db";
import { AccountForm } from '../components/gl-account-form';


export default async function NewAccountPage() {
  const headersList = await headers();
  const businessUnitId = headersList.get('x-business-unit-id');

  if (!businessUnitId) {
    return <div className="p-8">Error: Business Unit could not be identified.</div>;
  }

  const accountTypes = await prismadb.accountType.findMany({
    orderBy: { name: 'asc' }
  });

  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <AccountForm initialData={null} accountTypes={accountTypes} />
      </div>
    </div>
  );
}