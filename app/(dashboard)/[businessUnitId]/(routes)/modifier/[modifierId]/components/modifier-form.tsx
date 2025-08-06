"use client"

import * as z from "zod"
import axios from "axios"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Trash } from "lucide-react"
import { Modifier, ModifierGroup, InventoryItem } from "@prisma/client"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { Heading } from "@/components/ui/heading"
import { AlertModal } from "@/components/modals/alert-modal"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const formSchema = z.object({
  name: z.string().min(1),
  priceChange: z.number().min(0),
  modifierGroupId: z.string().min(1, { message: "Please select a group." }),
  inventoryItemId: z.string().optional(),
  quantityUsed: z.number().optional(),
});

type ModifierFormValues = z.infer<typeof formSchema>

interface ModifierFormProps {
  initialData: Modifier | null;
  modifierGroups: ModifierGroup[];
  inventoryItems: InventoryItem[];
};

export const ModifierForm: React.FC<ModifierFormProps> = ({ initialData, modifierGroups, inventoryItems }) => {
  const params = useParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const title = initialData ? 'Edit modifier' : 'Create modifier';
  const toastMessage = initialData ? 'Modifier updated.' : 'Modifier created.';
  const action = initialData ? 'Save changes' : 'Create';

  const form = useForm<ModifierFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      ...initialData,
      inventoryItemId: initialData.inventoryItemId ?? undefined,
      quantityUsed: initialData.quantityUsed ?? undefined,
    } : {
      name: '',
      priceChange: 0,
      modifierGroupId: '',
      inventoryItemId: undefined,
      quantityUsed: undefined,
    }
  });

  // Watch the value of the inventory item dropdown
  const selectedInventoryItem = form.watch('inventoryItemId');

  const onSubmit = async (data: ModifierFormValues) => {
    try {
      setLoading(true);
      if (initialData) {
        await axios.patch(`/api/${params.businessUnitId}/modifiers/${params.modifierId}`, data);
      } else {
        await axios.post(`/api/${params.businessUnitId}/modifiers`, data);
      }
      router.refresh();
      router.push(`/${params.businessUnitId}/modifiers`);
      toast.success(toastMessage);
    } catch (error: any) {
      toast.error(error.response?.data || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };
  
  const onDelete = async () => {
    try {
        setLoading(true);
        await axios.delete(`/api/${params.businessUnitId}/modifiers/${params.modifierId}`);
        router.refresh();
        router.push(`/${params.businessUnitId}/modifiers`);
        toast.success('Modifier deleted.');
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
        <Heading title={title} description={initialData ? 'Edit an existing modifier.' : 'Add a new modifier.'} />
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
            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Name</FormLabel><FormControl><Input disabled={loading} placeholder="e.g., Extra Bacon" {...field} /></FormControl><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="priceChange" render={({ field }) => ( <FormItem><FormLabel>Price Change</FormLabel><FormControl><Input type="number" disabled={loading} placeholder="e.g., 50 for +₱50 or 0" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)}/></FormControl><FormDescription>Enter 0 if this modifier has no extra cost.</FormDescription><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="modifierGroupId" render={({ field }) => (
              <FormItem>
                <FormLabel>Modifier Group</FormLabel>
                <Select disabled={loading} onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select a group" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {modifierGroups.map((group) => ( <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem> ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}/>
            <FormField control={form.control} name="inventoryItemId" render={({ field }) => (
              <FormItem>
                <FormLabel>Linked Inventory Item (Optional)</FormLabel>
                <Select disabled={loading} onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {/* --- FIX 1: Use a non-empty string for the "None" option --- */}
                    <SelectItem value="NONE_SELECTED">None</SelectItem>
                    {inventoryItems.map((item) => ( <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem> ))}
                  </SelectContent>
                </Select>
                <FormDescription>If selected, this item will be depleted from inventory when the modifier is used.</FormDescription>
                <FormMessage />
              </FormItem>
            )}/>
            
            {/* Conditional rendering for quantity used */}
            {selectedInventoryItem && selectedInventoryItem !== "NONE_SELECTED" && (
              <FormField control={form.control} name="quantityUsed" render={({ field }) => ( <FormItem><FormLabel>Quantity Used</FormLabel><FormControl><Input type="number" disabled={loading} placeholder="e.g., 2 (pieces)" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)}/></FormControl><FormDescription>How many units of the selected inventory item are used.</FormDescription><FormMessage /></FormItem> )}/>
            )}
          </div>
          <Button disabled={loading} className="ml-auto" type="submit">{action}</Button>
        </form>
      </Form>
    </>
  );
};