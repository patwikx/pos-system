"use client"

import * as z from "zod"
import axios from "axios"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import { CalendarIcon, Plus, Trash } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { format } from "date-fns"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { Heading } from "@/components/ui/heading"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn, formatter } from "@/lib/utils"
import { BusinessPartnerOption, GlAccountOption } from "@/types/financials-types"

const invoiceItemSchema = z.object({
  itemCode: z.string().min(1, "Menu item is required"),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  unitPrice: z.number().min(0, "Unit price must be non-negative"),
  lineTotal: z.number(),
  glAccountId: z.string().min(1, "GL Account is required")
});

const formSchema = z.object({
  bpCode: z.string().min(1, "Customer is required"),
  postingDate: z.date(),
  dueDate: z.date(),
  documentDate: z.date(),
  remarks: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required")
});

type ARInvoiceFormValues = z.infer<typeof formSchema>

interface ARInvoiceFormProps {
  customers: BusinessPartnerOption[];
  revenueAccounts: GlAccountOption[];
  menuItems: Array<{ id: string; name: string; price: number }>;
}

export const ARInvoiceForm: React.FC<ARInvoiceFormProps> = ({ 
  customers, 
  revenueAccounts,
  menuItems 
}) => {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<ARInvoiceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bpCode: '',
      postingDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      documentDate: new Date(),
      remarks: '',
      items: [{
        itemCode: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        lineTotal: 0,
        glAccountId: ''
      }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const watchedItems = form.watch("items");

  const onSubmit = async (data: ARInvoiceFormValues) => {
    try {
      setLoading(true);
      await axios.post(`/api/${params.businessUnitId}/ar-invoice`, data);
      router.push(`/${params.businessUnitId}/ar-invoice`);
      toast.success('A/R Invoice created successfully.');
    } catch (error: any) {
      toast.error(error.response?.data || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    append({
      itemCode: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      lineTotal: 0,
      glAccountId: ''
    });
  };

  const updateLineTotal = (index: number, quantity: number, unitPrice: number) => {
    const lineTotal = quantity * unitPrice;
    form.setValue(`items.${index}.lineTotal`, lineTotal);
  };

  const totalAmount = watchedItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0);

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading title="Create A/R Invoice" description="Create a new customer invoice" />
      </div>
      <Separator />
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
          {/* Header Information */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="bpCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <Select disabled={loading} onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.bpCode} value={customer.bpCode}>
                            {customer.name}
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
                name="postingDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Posting Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Remarks</FormLabel>
                    <FormControl>
                      <Textarea 
                        disabled={loading} 
                        placeholder="Additional notes..." 
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Invoice Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Invoice Items</CardTitle>
              <Button type="button" onClick={addItem} variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>Menu Item</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right w-[100px]">Qty</TableHead>
                      <TableHead className="text-right w-[120px]">Unit Price</TableHead>
                      <TableHead className="text-right w-[120px]">Total</TableHead>
                      <TableHead>Revenue Account</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell className="font-medium text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.itemCode`}
                            render={({ field }) => (
                              <FormItem>
                                <Select 
                                  disabled={loading} 
                                  onValueChange={(value) => {
                                    field.onChange(value);
                                    const selectedItem = menuItems.find(item => item.id === value);
                                    if (selectedItem) {
                                      form.setValue(`items.${index}.description`, selectedItem.name);
                                      form.setValue(`items.${index}.unitPrice`, selectedItem.price);
                                      updateLineTotal(index, watchedItems[index]?.quantity || 1, selectedItem.price);
                                    }
                                  }} 
                                  value={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select menu item" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {menuItems.map((item) => (
                                      <SelectItem key={item.id} value={item.id}>
                                        {item.name} - {formatter.format(item.price)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    disabled={loading}
                                    placeholder="Item description..."
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    disabled={loading}
                                    className="text-right"
                                    {...field}
                                    onChange={(e) => {
                                      const quantity = parseFloat(e.target.value) || 0;
                                      field.onChange(quantity);
                                      updateLineTotal(index, quantity, watchedItems[index]?.unitPrice || 0);
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.unitPrice`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    disabled={loading}
                                    className="text-right"
                                    {...field}
                                    onChange={(e) => {
                                      const unitPrice = parseFloat(e.target.value) || 0;
                                      field.onChange(unitPrice);
                                      updateLineTotal(index, watchedItems[index]?.quantity || 0, unitPrice);
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ₱{(watchedItems[index]?.lineTotal || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.glAccountId`}
                            render={({ field }) => (
                              <FormItem>
                                <Select disabled={loading} onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select account" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {revenueAccounts.map((account) => (
                                      <SelectItem key={account.id} value={account.id}>
                                        {account.accountCode} - {account.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                            disabled={fields.length === 1}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <div className="flex justify-between items-center mt-4 p-4 bg-muted/50 rounded-lg">
                <span className="font-semibold">Total Amount:</span>
                <span className="text-xl font-bold">₱{totalAmount.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button disabled={loading} type="submit">
              Create A/R Invoice
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
};