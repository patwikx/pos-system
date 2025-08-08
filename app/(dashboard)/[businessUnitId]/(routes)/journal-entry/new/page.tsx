import { headers } from 'next/headers';
import prismadb from "@/lib/db";
import { JournalEntryForm } from '../components/je-form';


export default async function NewJournalEntryPage() {
  const headersList = await headers();
  const businessUnitId = headersList.get('x-business-unit-id');

  if (!businessUnitId) {
    return <div className="p-8">Error: Business Unit could not be identified.</div>;
  }

  const accounts = await prismadb.glAccount.findMany({
    where: { businessUnitId },
    orderBy: { accountCode: 'asc' }
  });

  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <JournalEntryForm initialData={null} accounts={accounts} />
      </div>
    </div>
  );
}