"use client"

import * as z from "zod"
import axios from "axios"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Trash } from "lucide-react"
import { Discount, DiscountType } from "@prisma/client"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { Heading } from "@/components/ui/heading"
import { AlertModal } from "@/components/modals/alert-modal"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const formSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.nativeEnum(DiscountType),
  value: z.number().min(0),
  isActive: z.boolean().optional()
});

type DiscountFormValues = z.infer<typeof formSchema>

interface DiscountFormProps { initialData: Discount | null; };

export const DiscountForm: React.FC<DiscountFormProps> = ({ initialData }) => {
  const params = useParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const title = initialData ? 'Edit discount' : 'Create discount';
  const toastMessage = initialData ? 'Discount updated.' : 'Discount created.';
  const action = initialData ? 'Save changes' : 'Create';

  const form = useForm<DiscountFormValues>({
    resolver: zodResolver(formSchema),
    // --- THIS IS THE FIX ---
    // Transform `initialData` to convert Prisma's `null` to Zod's `undefined`
    defaultValues: initialData ? {
      ...initialData,
      description: initialData.description ?? undefined,
    } : {
      name: '', 
      description: undefined, 
      type: DiscountType.PERCENTAGE, 
      value: 0, 
      isActive: true
    }
  });

  const onSubmit = async (data: DiscountFormValues) => {
    try {
      setLoading(true);
      const dataToSend = { ...data, isActive: data.isActive ?? false };
      if (initialData) {
        await axios.patch(`/api/${params.businessUnitId}/discounts/${params.discountId}`, dataToSend);
      } else {
        await axios.post(`/api/${params.businessUnitId}/discounts`, dataToSend);
      }
      router.refresh();
      router.push(`/${params.businessUnitId}/discounts`);
      toast.success(toastMessage);
    } catch (error: any) { 
        toast.error(error.response?.data || "Something went wrong."); 
    } finally { 
        setLoading(false); 
    }
  };

  // --- COMPLETED DELETE LOGIC ---
  const onDelete = async () => {
    try {
        setLoading(true);
        await axios.delete(`/api/${params.businessUnitId}/discounts/${params.discountId}`);
        router.refresh();
        router.push(`/${params.businessUnitId}/discounts`);
        toast.success('Discount deleted.');
    } catch (error: any) {
        toast.error(error.response?.data || 'Something went wrong.');
    } finally {
        setLoading(false);
        setOpen(false);
    }
  };

  return (
    <>
      <AlertModal isOpen={open} onClose={() => setOpen(false)} onConfirm={onDelete} loading={loading} />
      <div className="flex items-center justify-between">
        <Heading title={title} description={initialData ? 'Edit an existing discount.' : 'Add a new discount or promotion.'} />
        {initialData && (
          <Button disabled={loading} variant="destructive" size="sm" onClick={() => setOpen(true)}>
            <Trash className="h-4 w-4" />
          </Button>
        )}
      </div>
      <Separator />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
          <div className="md:grid md:grid-cols-3 gap-8">
            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Name</FormLabel><FormControl><Input disabled={loading} placeholder="e.g., Senior Citizen Discount" {...field} /></FormControl><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem>
                <FormLabel>Discount Type</FormLabel>
                <Select disabled={loading} onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select a type" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {Object.values(DiscountType).map((type) => ( <SelectItem key={type} value={type}>{type}</SelectItem> ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}/>
            <FormField control={form.control} name="value" render={({ field }) => ( <FormItem><FormLabel>Value</FormLabel><FormControl><Input type="number" disabled={loading} placeholder="e.g., 20 for 20% or 50 for ₱50" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormDescription>For PERCENTAGE, enter a number (e.g., 20 for 20%). For FIXED_AMOUNT, enter a monetary value.</FormDescription><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea disabled={loading} placeholder="Describe the discount" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="isActive" render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <div className="space-y-1 leading-none">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>This discount will be available for use in orders.</FormDescription>
                    </div>
                </FormItem>
            )}/>
          </div>
          <Button disabled={loading} className="ml-auto" type="submit">{action}</Button>
        </form>
      </Form>
    </>
  );
};