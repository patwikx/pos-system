"use client"

import * as z from "zod"
import axios from "axios"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Trash } from "lucide-react"
import { InventoryItem, UoM } from "@prisma/client"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { Heading } from "@/components/ui/heading"
import { AlertModal } from "@/components/modals/alert-modal"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"

// 1. FIX: Schema is now simpler, focusing only on the master item.
const formSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  uomId: z.string().min(1, { message: "Please select a Unit of Measure." }),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

type InventoryItemFormValues = z.infer<typeof formSchema>

interface InventoryItemFormProps {
  initialData: InventoryItem | null; // 2. FIX: Prop is now just the InventoryItem
  uoms: UoM[];
};

export const InventoryItemForm: React.FC<InventoryItemFormProps> = ({ initialData, uoms }) => {
  const params = useParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const title = initialData ? 'Edit inventory item' : 'Create inventory item';
  const descriptionText = initialData ? 'Edit an existing raw ingredient.' : 'Add a new raw ingredient to your inventory.';
  const toastMessage = initialData ? 'Item updated.' : 'Item created.';
  const action = initialData ? 'Save changes' : 'Create';

  const form = useForm<InventoryItemFormValues>({
    resolver: zodResolver(formSchema),
    // 3. FIX: defaultValues are simpler now.
    defaultValues: initialData ? {
        name: initialData.name,
        description: initialData.description ?? undefined,
        uomId: initialData.uomId,
        isActive: initialData.isActive,
    } : {
      name: '', 
      description: undefined,
      uomId: '', 
      isActive: true,
    }
  });

  const onSubmit = async (data: InventoryItemFormValues) => {
    try {
      setLoading(true);
      const dataToSend = { ...data, isActive: data.isActive ?? false };

      if (initialData) {
        await axios.patch(`/api/${params.businessUnitId}/inventory/${params.inventoryItemId}`, dataToSend);
      } else {
        await axios.post(`/api/${params.businessUnitId}/inventory`, dataToSend);
      }
      router.refresh();
      router.push(`/${params.businessUnitId}/inventory`);
      toast.success(toastMessage);
    } catch (error: any) {
      toast.error(error.response?.data || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => { /* ... delete logic ... */ };

  return (
    <>
      <AlertModal isOpen={open} onClose={() => setOpen(false)} onConfirm={onDelete} loading={loading} />
      <div className="flex items-center justify-between">
        <Heading title={title} description={descriptionText} />
        {initialData && (
          <Button disabled={loading} variant="destructive" size="sm" onClick={() => setOpen(true)}>
            <Trash className="h-4 w-4" />
          </Button>
        )}
      </div>
      <Separator />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
          {/* 4. FIX: Removed quantity and reorder point fields */}
          <div className="md:grid md-grid-cols-3 gap-8">
            <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input disabled={loading} placeholder="e.g., Beef Patty 150g" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="uomId" render={({ field }) => (
              <FormItem>
                <FormLabel>Unit of Measure (UoM)</FormLabel>
                <Select disabled={loading} onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select a unit" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {uoms.map((uom) => (
                      <SelectItem key={uom.id} value={uom.id}>{uom.name} ({uom.symbol})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}/>
            <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea disabled={loading} placeholder="Item details or supplier notes" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="isActive" render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <div className="space-y-1 leading-none">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>This item can be used in recipes and purchased.</FormDescription>
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