import { headers } from 'next/headers';
import prismadb from "@/lib/db";
import { AccountForm } from '../components/gl-accounts-forms';

export default async function AccountPage() {
  const headersList = await headers();
  const pathname = headersList.get('next-url') || '';
  const businessUnitId = headersList.get('x-business-unit-id');
  
  const accountId = pathname.split('/').pop();

  if (!businessUnitId || !accountId) {
    return <div className="p-8">Error: Could not determine the account or business unit.</div>;
  }

  const account = accountId === 'new' ? null : await prismadb.glAccount.findUnique({
    where: { id: accountId },
    include: {
      accountType: true,
      _count: {
        select: { journalLines: true }
      }
    }
  });

  const accountTypes = await prismadb.accountType.findMany({
    orderBy: { name: 'asc' }
  });

  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <AccountForm initialData={account} accountTypes={accountTypes} />
      </div>
    </div>
  );
}