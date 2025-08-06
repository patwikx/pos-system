"use client"

import * as z from "zod"
import axios from "axios"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Trash } from 'lucide-react'
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { Heading } from "@/components/ui/heading"
import { AlertModal } from "@/components/modals/alert-modal"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

// Placeholder for ModifierGroup type, as it comes from Prisma
interface ModifierGroup {
  id: string;
  name: string;
  businessUnitId: string;
}

const formSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
});

type ModifierGroupFormValues = z.infer<typeof formSchema>

interface ModifierGroupFormProps {
  initialData: ModifierGroup | null;
};

export const ModifierGroupForm: React.FC<ModifierGroupFormProps> = ({ initialData }) => {
  const params = useParams();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const title = initialData ? 'Edit group' : 'Create group';
  const toastMessage = initialData ? 'Group updated.' : 'Group created.';
  const action = initialData ? 'Save changes' : 'Create';

  const form = useForm<ModifierGroupFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || { name: '' }
  });

  const onSubmit = async (data: ModifierGroupFormValues) => {
    try {
      setLoading(true);
      if (initialData) {
        await axios.patch(`/api/${params.businessUnitId}/modifier-groups/${params.modifierGroupId}`, data);
      } else {
        await axios.post(`/api/${params.businessUnitId}/modifier-groups`, data);
      }
      router.refresh();
      router.push(`/${params.businessUnitId}/modifier-groups`);
      toast.success(toastMessage);
    } catch (error: any) {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/${params.businessUnitId}/modifier-groups/${params.modifierGroupId}`);
      router.refresh();
      router.push(`/${params.businessUnitId}/modifier-groups`);
      toast.success('Group deleted.');
    } catch (error: any) {
      toast.error('Make sure you removed all modifiers using this group first.');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <>
      <AlertModal isOpen={open} onClose={() => setOpen(false)} onConfirm={onDelete} loading={loading} />
      <div className="flex items-center justify-between mb-4">
        <Heading title={title} description={initialData ? 'Edit an existing modifier group.' : 'Add a new modifier group.'} />
        {initialData && (
          <Button disabled={loading} variant="destructive" size="sm" onClick={() => setOpen(true)}>
            <Trash className="h-4 w-4" />
          </Button>
        )}
      </div>
      <Separator className="my-6" />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Group Details</CardTitle>
              <CardDescription>Enter the name for your modifier group.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input disabled={loading} placeholder="e.g., Add-Ons, Sauce Choices" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end border-t pt-4">
              <Button disabled={loading} type="submit">
                {action}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </>
  );
};
