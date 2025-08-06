import { headers } from "next/headers";
import prismadb from "@/lib/db";
import { DiscountForm } from "./components/discount-form";

export default async function DiscountPage({
  params
}: {
  params: Promise<{ discountId: string }>;
}) {
  // Await params (Next.js 14+ requirement)
  const { discountId } = await params;

  // Get businessUnitId from headers (for consistency with other pages)
  const headersList = await headers();
  const businessUnitId = headersList.get("x-business-unit-id");

  // Optional: safety check if you want to ensure the BU context is valid
  if (!businessUnitId) {
    return (
      <div className="p-8">
        <p>Error: Could not determine the Business Unit from the request.</p>
      </div>
    );
  }

  const discount = await prismadb.discount.findUnique({
    where: {
      id: discountId,
      businessUnitId // Optional filter if discounts are BU-specific
    }
  });

  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <DiscountForm initialData={discount} />
      </div>
    </div>
  );
}
