import { headers } from 'next/headers';
import prismadb from "@/lib/db";
import { JournalEntryForm } from './components/journal-entry-form';


export default async function JournalEntryPage() {
  const headersList = await headers();
  const pathname = headersList.get('next-url') || '';
  const businessUnitId = headersList.get('x-business-unit-id');
  
  const entryId = pathname.split('/').pop();

  if (!businessUnitId || !entryId) {
    return <div className="p-8">Error: Could not determine the journal entry or business unit.</div>;
  }

  const [journalEntry, accounts] = await Promise.all([
    entryId === 'new' ? null : prismadb.journalEntry.findUnique({
      where: { id: entryId },
      include: {
        author: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
        lines: {
          include: {
            glAccount: true
          }
        }
      }
    }),
    prismadb.glAccount.findMany({
      where: { businessUnitId },
      orderBy: { accountCode: 'asc' }
    })
  ]);

  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <JournalEntryForm initialData={journalEntry} accounts={accounts} />
      </div>
    </div>
  );
}