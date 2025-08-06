'use client'

import * as z from "zod"
import axios from "axios"
import { useState, useRef } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm } from "react-hook-form"
import { Loader, Plus, Trash, Upload } from 'lucide-react'
import { Category, Color, Image as PrismaImage, Product, Size, UoM } from "@prisma/client"
import { useParams, useRouter } from "next/navigation"
import * as XLSX from 'xlsx'
import Image from "next/image"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { AlertModal } from "@/components/modals/alert-modal"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { UploadButton } from "@uploadthing/react"
import { OurFileRouter } from "@/app/api/uploadthing/core"
import { Textarea } from "@/components/ui/textarea"
import { Heading } from "@/components/ui/heading"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { ToastAction } from "@/components/ui/toast"

const productSchema = z.object({
  barCode: z.string().min(13),
  name: z.string().min(1),
  itemDesc: z.string().optional(),
  images: z.object({ url: z.string() }).array().optional(),
  price: z.coerce.number().min(1),
  categoryId: z.string().min(1),
  colorId: z.string().optional(),
  sizeId: z.string().optional(),
  uomId: z.string().min(1).nullable(),
  isFeatured: z.boolean().default(false),
  isArchived: z.boolean().default(false)
});

const formSchema = z.object({
  products: z.array(productSchema)
});

type ProductFormValues = z.infer<typeof formSchema>

interface ProductFormProps {
  initialData: Product & {
    images: PrismaImage[]
  } | null;
  categories: Category[];
  colors: Color[];
  sizes: Size[];
  uoms: UoM[];
}

export const ProductForm: React.FC<ProductFormProps> = ({
  initialData,
  categories,
  colors,
  sizes,
  uoms
}) => {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isImportMode, setIsImportMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      products: initialData ? [
        {
          ...initialData,
          price: parseFloat(String(initialData?.price)),
          itemDesc: initialData.itemDesc || '',
          images: initialData.images.map(img => ({ url: img.url })),
          uomId: initialData.uomId || '',
        },
      ] : [{
        barCode: '',
        name: '',
        itemDesc: '',
        images: [],
        price: 0,
        categoryId: '',
        colorId: '',
        sizeId: '',
        uomId: '',
        isFeatured: false,
        isArchived: false,
      }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    name: "products",
    control: form.control
  });

  const onSubmit = async (data: ProductFormValues) => {
    try {
      setLoading(true);
      const productsToSubmit = data.products.map(product => ({
        ...product,
        images: product.images || [],
        uomId: product.uomId || null,
      }));
      if (initialData) {
        await axios.patch(`/api/${params.storeId}/products/${params.productId}`, productsToSubmit[0]);
      } else {
        await axios.post(`/api/${params.storeId}/products/bulk-create`, { products: productsToSubmit });
      }
      router.refresh();
      router.push(`/${params.storeId}/products`);
      toast({
        title: initialData ? "Product Updated" : "Products Created",
        description: initialData ? "Your product has been updated successfully." : "Your products have been created successfully.",
        action: <ToastAction altText="View products">View</ToastAction>,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/${params.storeId}/products/${params.productId}`);
      router.refresh();
      router.push(`/${params.storeId}/products`);
      toast({
        title: "Product Deleted",
        description: "The product has been deleted successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  const handleFileUpload = (res: any, index: number) => {
    if (res && res.length > 0) {
        const newImages = res.map((file: { url: string }) => ({ url: file.url }));
        const currentImages = form.getValues(`products.${index}.images`) || [];
        form.setValue(`products.${index}.images`, [...currentImages, ...newImages], {
            shouldDirty: true,
            shouldValidate: true,
        });
        toast({
            title: "Upload Completed",
            description: `${newImages.length} image(s) have been uploaded.`,
        });
    }
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const products = jsonData.map((row: any) => ({
          barCode: String(row.barCode || ''),
          name: String(row.name || ''),
          itemDesc: String(row.itemDesc || ''),
          images: [],
          price: Number(row.price || 0),
          categoryId: String(row.categoryId || ''),
          colorId: String(row.colorId || ''),
          sizeId: String(row.sizeId || ''),
          uomId: String(row.uomId || ''),
          isFeatured: Boolean(row.isFeatured),
          isArchived: Boolean(row.isArchived),
        }));

        form.setValue('products', products);
        setIsImportMode(true);
        toast({
          title: "Excel Import Successful",
          description: `${products.length} products loaded from Excel`,
        });
      };

      reader.readAsBinaryString(file);
    } catch (error) {
      toast({
        title: "Error",
        description: "Error importing Excel file. Please try again.",
        variant: "destructive",
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        barCode: '1234567890123',
        name: 'Example Product',
        itemDesc: 'Product Description',
        price: 99.99,
        categoryId: categories[0]?.id || '',
        colorId: colors[0]?.id || '',
        sizeId: sizes[0]?.id || '',
        uomId: uoms[0]?.id || '',
        isFeatured: false,
        isArchived: false
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, 'product-template.xlsx');
  };

  const handleCancelImport = () => {
    form.reset({
      products: [{
        barCode: '',
        name: '',
        itemDesc: '',
        images: [],
        price: 0,
        categoryId: '',
        colorId: '',
        sizeId: '',
        uomId: '',
        isFeatured: false,
        isArchived: false,
      }]
    });
    setIsImportMode(false);
  };

  // ✅ **FIXED** `handleRemoveImage` with a check for the product's existence.
  const handleRemoveImage = (index: number, imageIndex: number) => {
    const currentProducts = form.getValues('products');
    const product = currentProducts[index]; 

    if (product && product.images) {
        product.images.splice(imageIndex, 1);
        form.setValue('products', currentProducts, { shouldDirty: true, shouldValidate: true });
    }
  };

  return (
    <>
      <AlertModal 
        isOpen={open} 
        onClose={() => setOpen(false)}
        onConfirm={onDelete}
        loading={loading}
      />
      <div className="flex items-center justify-between">
        <Heading 
          title={initialData ? 'Edit product' : 'Create product'} 
          description={initialData ? 'Edit a product.' : 'Add a new product'}
        />
        {!initialData && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={downloadTemplate}
            >
              Download Template
            </Button>
            <div className="relative">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcelImport}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import Excel
              </Button>
            </div>
          </div>
        )}
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
          {isImportMode ? (
            // ... (Table for import mode remains unchanged)
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Barcode</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>UoM</TableHead>
                    <TableHead>Featured</TableHead>
                    <TableHead>Images</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`products.${index}.barCode`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input {...field} className="w-[180px]" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`products.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`products.${index}.itemDesc`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`products.${index}.price`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input {...field} type="number" className="w-[100px]" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`products.${index}.categoryId`}
                          render={({ field }) => (
                            <FormItem>
                              <Select 
                                onValueChange={field.onChange} 
                                value={field.value} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue defaultValue={field.value} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {categories.map((category) => (
                                    <SelectItem key={category.id} value={category.id}>
                                      {category.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`products.${index}.sizeId`}
                          render={({ field }) => (
                            <FormItem>
                              <Select 
                                onValueChange={field.onChange} 
                                value={field.value} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue defaultValue={field.value} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {sizes.map((size) => (
                                    <SelectItem key={size.id} value={size.id}>
                                      {size.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`products.${index}.colorId`}
                          render={({ field }) => (
                            <FormItem>
                              <Select 
                                onValueChange={field.onChange} 
                                value={field.value} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                <SelectValue defaultValue={field.value} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {colors.map((color) => (
                                    <SelectItem key={color.id} value={color.id}>
                                      {color.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`products.${index}.uomId`}
                          render={({ field }) => (
                            <FormItem>
                              <Select 
                                onValueChange={field.onChange} 
                                value={field.value || ''} 
                                defaultValue={field.value || ''}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue defaultValue={field.value || ''} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {uoms.map((uom) => (
                                    <SelectItem key={uom.id} value={uom.id}>
                                      {uom.UoM}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`products.${index}.isFeatured`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <UploadButton<OurFileRouter, "image">
                          endpoint="image"
                          onClientUploadComplete={(res) => handleFileUpload(res, index)}
                          onUploadError={(error: Error) => {
                            toast({
                              title: "Error",
                              description: "Something went wrong. Please try again.",
                              variant: "destructive",
                            });
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => remove(index)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mb-4 ml-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                  onClick={() => append({
                    barCode: '',
                    name: '',
                    itemDesc: '',
                    images: [],
                    price: 0,
                    categoryId: '',
                    colorId: '',
                    sizeId: '',
                    uomId: '',
                    isFeatured: false,
                    isArchived: false,
                  })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Product
                </Button>
              </div>
            </div>
          ) : (
            fields.map((field, index) => {
              // ✅ **FIXED** by defining a safe variable for watched images
              const currentImages = form.watch(`products.${index}.images`);

              return (
              <Card key={field.id} className="p-4">
                <div className="grid gap-8">
                  <div className="mt-2 flex flex-col items-center justify-center">
                    <label className="block text-center">
                      <div className="flex flex-col items-center mt-4">
                        <label className="flex flex-col items-center p-4 border-2 border-dashed border-gray-400 rounded-lg cursor-pointer hover:border-gray-600 transition duration-300">
                          <span className="text-center font-bold text-md mb-2 text-gray-600">Background Images</span>
                          <UploadButton<OurFileRouter, "image">
                            endpoint="image"
                            onClientUploadComplete={(res) => handleFileUpload(res, index)}
                            onUploadError={(error: Error) => {
                              toast({
                                title: "Error",
                                description: "Something went wrong. Please try again.",
                                variant: "destructive",
                              });
                            }}
                          />
                          <div className="flex flex-col items-center">
                            <span className="text-gray-500">Drag & Drop or Click to Upload</span>
                          </div>
                        </label>
                      </div>
                    </label>
                  </div>
                  
                  {currentImages && currentImages.length > 0 && (
                    <div className="p-4 border rounded-md">
                        <div className="mb-4 flex items-center gap-4">
                            <h3 className="text-lg font-semibold">Current Images</h3>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                        {currentImages.map((image, imageIndex) => (
                            <div key={image.url} className="relative group aspect-square">
                            <Image
                                fill
                                className="object-cover rounded-md"
                                alt="Product Image Preview"
                                src={image.url}
                            />
                            <div className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                type="button"
                                onClick={() => handleRemoveImage(index, imageIndex)}
                                variant="destructive"
                                size="icon"
                                >
                                <Trash className="h-4 w-4" />
                                </Button>
                            </div>
                            </div>
                        ))}
                        </div>
                    </div>
                  )}

                  <div className="grid gap-8 grid-cols-1 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name={`products.${index}.barCode`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Barcode</FormLabel>
                          <FormControl>
                            <Input disabled={loading} placeholder="Barcode" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`products.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input disabled={loading} placeholder="Product name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`products.${index}.itemDesc`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Item Description</FormLabel>
                          <FormControl>
                            <Textarea disabled={loading} placeholder="Item Description" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`products.${index}.price`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price</FormLabel>
                          <FormControl>
                            <Input type="number" disabled={loading} placeholder="9.99" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`products.${index}.categoryId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select 
                            disabled={loading} 
                            onValueChange={field.onChange} 
                            value={field.value} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue defaultValue={field.value} placeholder="Select a category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`products.${index}.sizeId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Size</FormLabel>
                          <Select 
                            disabled={loading} 
                            onValueChange={field.onChange} 
                            value={field.value} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue defaultValue={field.value} placeholder="Select a size" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {sizes.map((size) => (
                                <SelectItem key={size.id} value={size.id}>
                                  {size.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`products.${index}.colorId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Color</FormLabel>
                          <Select 
                            disabled={loading} 
                            onValueChange={field.onChange} 
                            value={field.value} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue defaultValue={field.value} placeholder="Select a color" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {colors.map((color) => (
                                <SelectItem key={color.id} value={color.id}>
                                  {color.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`products.${index}.uomId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit of Measure</FormLabel>
                          <Select 
                            disabled={loading} 
                            onValueChange={field.onChange} 
                            value={field.value || ''} 
                            defaultValue={field.value || ''}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue defaultValue={field.value || ''} placeholder="Select a UoM" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {uoms.map((uom) => (
                                <SelectItem key={uom.id} value={uom.id}>
                                  {uom.UoM}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`products.${index}.isFeatured`}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Featured
                            </FormLabel>
                            <FormDescription>
                              This product will appear on the home page
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => remove(index)}
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      Remove Product
                    </Button>
                  )}
                </div>
              </Card>
            )}))}
          <div className="flex justify-end gap-4">
            {isImportMode && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelImport}
              >
                Cancel Import
              </Button>
            )}
            <Button disabled={loading} type="submit">
              {loading ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  {initialData ? 'Saving...' : 'Creating...'}
                </>
              ) : (
                initialData ? 'Save changes' : 'Create'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
};