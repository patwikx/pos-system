import { headers } from 'next/headers'; // 1. Import the headers function
import prismadb from "@/lib/db";
import { AccountingPeriodForm } from "./components/accounting-period-form";

// 2. Remove `params` from the function signature
export default async function AccountingPeriodPage() {
  // 3. Get the full pathname from the headers
  const headersList = await headers();
  const pathname = headersList.get('next-url') || '';
  
  // 4. Extract the accountingPeriodId from the last segment of the URL
  // This will be either the ID or the word "new"
  const accountingPeriodId = pathname.split('/').pop();

  // A safety check
  if (!accountingPeriodId) {
    return <div className="p-8">Error: Could not determine the Accounting Period ID from the URL.</div>;
  }

  const period = await prismadb.accountingPeriod.findUnique({
    where: {
      // If the ID is "new", findUnique will correctly return null
      id: accountingPeriodId,
    }
  });

  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <AccountingPeriodForm initialData={period} />
      </div>
    </div>
  );
}