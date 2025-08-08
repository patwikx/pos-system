import { headers } from "next/headers";
import { format } from "date-fns";
import prismadb from "@/lib/db";
import { OutgoingPaymentColumn } from "@/types/financials-types";
import { OutgoingPaymentsClient } from "./components/outgoing-payments-client";
import { formatter } from "@/lib/utils";

export default async function OutgoingPaymentsPage() {
  const headersList = await headers();
  const businessUnitId = headersList.get("x-business-unit-id");

  if (!businessUnitId) {
    return <div className="p-8">Error: Business Unit could not be identified.</div>;
  }

  const payments = await prismadb.outgoingPayment.findMany({
    where: { businessUnitId },
    include: {
      businessPartner: { select: { bpCode: true, name: true } },
      bankAccount: { select: { id: true, name: true } },
      journalEntry: true
    },
    orderBy: { createdAt: 'desc' }
  });
  
  const formattedPayments: OutgoingPaymentColumn[] = payments.map((payment) => ({
    id: payment.id,
    docNum: payment.docNum,
    vendorName: payment.businessPartner.name,
    paymentDate: format(payment.paymentDate, 'MMM dd, yyyy'),
    amount: formatter.format(payment.amount),
    bankAccount: payment.bankAccount.name,
    createdAt: format(payment.createdAt, 'MMMM do, yyyy'),
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <OutgoingPaymentsClient data={formattedPayments} />
      </div>
    </div>
  );
}