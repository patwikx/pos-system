import { headers } from "next/headers";
import { format } from "date-fns";
import { getARInvoices } from "@/lib/actions/financials-actions";
import { ARInvoiceColumn } from "@/types/financials-types";
import { formatter } from "@/lib/utils";
import { ARInvoiceClient } from "./components/ar-invoice-client";

export default async function ARInvoicePage() {
  const headersList = await headers();
  const businessUnitId = headersList.get("x-business-unit-id");

  if (!businessUnitId) {
    return <div className="p-8">Error: Business Unit could not be identified.</div>;
  }

  const result = await getARInvoices({ businessUnitId });
  
  const formattedInvoices: ARInvoiceColumn[] = result.data.map((invoice) => {
    const balance = invoice.totalAmount - invoice.amountPaid;
    const isOverdue = new Date() > invoice.dueDate && balance > 0;

    return {
      id: invoice.id,
      docNum: invoice.docNum,
      customerName: invoice.businessPartner.name,
      postingDate: format(invoice.postingDate, 'MMM dd, yyyy'),
      dueDate: format(invoice.dueDate, 'MMM dd, yyyy'),
      totalAmount: formatter.format(invoice.totalAmount),
      amountPaid: formatter.format(invoice.amountPaid),
      balance: formatter.format(balance),
      status: invoice.status,
      overdue: isOverdue,
      createdAt: format(invoice.createdAt, 'MMMM do, yyyy'),
    };
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <ARInvoiceClient data={formattedInvoices} />
      </div>
    </div>
  );
}