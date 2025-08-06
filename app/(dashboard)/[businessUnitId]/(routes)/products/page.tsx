import { format } from "date-fns";
import { formatter } from "@/lib/utils";


import { ProductColumn } from "./components/columns";
import prismadb from "@/lib/db";
import { ProductsClient } from "./components/client";


const ProductsPage = async ({
  params
}: {
  params: { storeId: string }
}) => {
  const products = await prismadb.product.findMany({
    where: {
      storeId: params.storeId
    },
    include: {
      category: true,
      size: true,
      color: true,
      uom: true,
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const formattedProducts: ProductColumn[] = products.map((item) => ({
    id: item.id,
    barCode: item.barCode,
    name: item.name,
    itemDesc: item.itemDesc || '',
    isFeatured: item.isFeatured,
    isArchived: item.isArchived,
    UoM: item.uom ? item.uom.UoM : '',
    price: formatter.format(item.price),
    category: item.category.name,
    size: item.size.name,
    color: item.color.value,
    createdAt: format(item.createdAt, 'MMMM do, yyyy'),
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <ProductsClient data={formattedProducts} />
      </div>
    </div>
  );
};

export default ProductsPage;
