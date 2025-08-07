import { format } from "date-fns";
import { headers } from "next/headers";
import prismadb from "@/lib/db";
import { formatter } from "@/lib/utils";

import { JournalEntryColumn } from "./components/columns";
import { JournalEntryClient } from "./components/client";

export default async function JournalEntryPage() {
  const headersList = await headers();
  const businessUnitId = headersList.get("x-business-unit-id");

  if (!businessUnitId) {
    return <div className="p-8">Error: Business Unit could not be identified.</div>;
  }

  const journalEntries = await prismadb.journalEntry.findMany({
    where: { businessUnitId },
    include: {
      author: { select: { id: true, name: true } },
      lines: {
        include: {
          glAccount: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const formattedEntries: JournalEntryColumn[] = journalEntries.map((entry) => {
    const totalDebit = entry.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredit = entry.lines.reduce((sum, line) => sum + (line.credit || 0), 0);

    return {
      id: entry.id,
      docNum: entry.docNum,
      postingDate: format(entry.postingDate, 'MMM dd, yyyy'),
      author: entry.author.name || 'Unknown',
      remarks: entry.remarks || '',
      totalDebit: formatter.format(totalDebit),
      totalCredit: formatter.format(totalCredit),
      status: 'OPEN', // Default status since it's not in your current schema
      createdAt: format(entry.createdAt, 'MMMM do, yyyy'),
    };
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <JournalEntryClient data={formattedEntries} />
      </div>
    </div>
  );
}