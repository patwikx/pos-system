"use client"

import * as z from "zod"
import axios from "axios"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Trash } from "lucide-react"
import { MenuCategory, MenuItem } from "@prisma/client"
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

// --- FIX 1: Change `z.coerce.number()` to a simpler `z.number()` ---
// This removes the type ambiguity that was causing the complex resolver error.
const formSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  imageUrl: z.string().optional(),
  price: z.number().min(0, { message: "Price must be 0 or greater." }),
  categoryId: z.string().min(1, { message: "Please select a category." }),
  description: z.string().optional(),
  isActive: z.boolean().default(true).optional(),
});

type MenuItemFormValues = z.infer<typeof formSchema>

interface MenuItemFormProps {
  initialData: MenuItem | null;
  categories: MenuCategory[];
};

export const MenuItemForm: React.FC<MenuItemFormProps> = ({ initialData, categories }) => {
  const params = useParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const title = initialData ? 'Edit menu item' : 'Create menu item';
  const description = initialData ? 'Edit an existing item.' : 'Add a new item to the menu';
  const toastMessage = initialData ? 'Menu item updated.' : 'Menu item created.';
  const action = initialData ? 'Save changes' : 'Create';

  const form = useForm<MenuItemFormValues>({
    resolver: zodResolver(formSchema),
    // The previous fix for null vs undefined is still correct and necessary here.
    defaultValues: initialData ? {
      name: initialData.name,
      price: parseFloat(String(initialData.price)),
      categoryId: initialData.categoryId,
      imageUrl: initialData.imageUrl ?? undefined,
      description: initialData.description ?? undefined,
      isActive: initialData.isActive,
    } : {
      name: '',
      imageUrl: undefined,
      price: 0,
      categoryId: '',
      description: undefined,
      isActive: true,
    }
  });

  const onSubmit = async (data: MenuItemFormValues) => {
    try {
      setLoading(true);
      if (initialData) {
        await axios.patch(`/api/${params.businessUnitId}/menu-items/${params.menuItemId}`, data);
      } else {
        await axios.post(`/api/${params.businessUnitId}/menu-items`, data);
      }
      router.refresh();
      router.push(`/${params.businessUnitId}/menu-items`);
      toast.success(toastMessage);
    } catch (error) {
      toast.error(`Something went wrong: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => { /* ... delete logic ... */ };

  return (
    <>
      <AlertModal isOpen={open} onClose={() => setOpen(false)} onConfirm={onDelete} loading={loading} />
      <div className="flex items-center justify-between">
        <Heading title={title} description={description} />
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
            <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                        <Input disabled={loading} placeholder="e.g., Classic Burger" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}/>
            <FormField control={form.control} name="price" render={({ field }) => (
                <FormItem>
                    <FormLabel>Price</FormLabel>
                    <FormControl>
                        {/* --- FIX 2: Explicitly parse the input value to a number --- */}
                        <Input 
                            type="number" 
                            disabled={loading} 
                            placeholder="0.00" 
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}/>
            <FormField control={form.control} name="categoryId" render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select disabled={loading} onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue defaultValue={field.value} placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}/>
            <FormField control={form.control} name="isActive" render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>This item will appear on the menu.</FormDescription>
                    </div>
                </FormItem>
            )}/>
          </div>
          <Button disabled={loading} className="ml-auto" type="submit">
            {action}
          </Button>
        </form>
      </Form>
    </>
  );
};