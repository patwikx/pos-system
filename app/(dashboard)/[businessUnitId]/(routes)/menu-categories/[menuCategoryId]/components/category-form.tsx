"use client"

import * as z from "zod"
import axios from "axios"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Trash } from "lucide-react"
import { MenuCategory } from "@prisma/client"
import { useParams, useRouter } from "next/navigation"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { Heading } from "@/components/ui/heading"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { AlertModal } from "@/components/modals/alert-modal"

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  description: z.string().optional(),
  prepStation: z.string().optional(),
});

type MenuCategoryFormValues = z.infer<typeof formSchema>

interface MenuCategoryFormProps {
  initialData: MenuCategory | null;
};

export const MenuCategoryForm: React.FC<MenuCategoryFormProps> = ({
  initialData,
}) => {
  const params = useParams();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const title = initialData ? 'Edit Menu Category' : 'Create Menu Category';
  const description = initialData ? 'Edit an existing menu category.' : 'Add a new menu category';
  const toastMessage = initialData ? 'Menu category updated.' : 'Menu category created.';
  const action = initialData ? 'Save changes' : 'Create';

  const form = useForm<MenuCategoryFormValues>({
    resolver: zodResolver(formSchema),
    // --- THIS IS THE FIX ---
    // Transform the `initialData` to convert `null` values to `undefined`
    // to match the Zod schema's expectations.
    defaultValues: initialData ? {
      ...initialData,
      description: initialData.description ?? undefined,
      prepStation: initialData.prepStation ?? undefined,
    } : {
      name: '',
      description: undefined,
      prepStation: undefined,
    }
  });

  const onSubmit = async (data: MenuCategoryFormValues) => {
    try {
      setLoading(true);
      if (initialData) {
        await axios.patch(`/api/${params.businessUnitId}/menu-categories/${params.menuCategoryId}`, data);
      } else {
        await axios.post(`/api/${params.businessUnitId}/menu-categories`, data);
      }
      router.refresh();
      router.push(`/${params.businessUnitId}/menu-categories`);
      toast.success(toastMessage);
    } catch (error) {
      toast.error(`Something went wrong: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/${params.businessUnitId}/menu-categories/${params.menuCategoryId}`);
      router.refresh();
      router.push(`/${params.businessUnitId}/menu-categories`);
      toast.success("Menu category deleted.");
    } catch (error) {
     toast.error(`Something went wrong: ${error}`);
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  return (
    <>
      <AlertModal 
        isOpen={open} 
        onClose={() => setOpen(false)}
        onConfirm={onDelete}
        loading={loading}
      />
      <div className="flex items-center justify-between">
        <Heading title={title} description={description} />
        {initialData && (
          <Button
            disabled={loading}
            variant="destructive"
            size="sm"
            onClick={() => setOpen(true)}
          >
            <Trash className="h-4 w-4" />
          </Button>
        )}
      </div>
      <Separator />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
          <div className="md:grid md:grid-cols-3 gap-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input disabled={loading} placeholder="e.g., Appetizers, Main Courses" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      disabled={loading}
                      placeholder="A short description for the category"
                      {...field}
                      // This part is still correct! React inputs need `|| ''` to avoid an error about
                      // switching between controlled and uncontrolled components.
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="prepStation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prep Station (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                        disabled={loading} 
                        placeholder="e.g., Hot Kitchen, Grill, Bar" 
                        {...field} 
                        value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button disabled={loading} className="ml-auto" type="submit">
            {action}
          </Button>
        </form>
      </Form>
    </>
  );
};