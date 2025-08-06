"use client"

import * as z from "zod"
import axios from "axios"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Trash } from "lucide-react"
import { PosTerminal } from "@prisma/client"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { Heading } from "@/components/ui/heading"
import { AlertModal } from "@/components/modals/alert-modal"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"

const formSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  description: z.string().optional(),
  isActive: z.boolean().default(true).optional(),
});

type TerminalFormValues = z.infer<typeof formSchema>

interface TerminalFormProps {
  initialData: PosTerminal | null;
};

export const TerminalForm: React.FC<TerminalFormProps> = ({ initialData }) => {
  const params = useParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const title = initialData ? 'Edit terminal' : 'Create terminal';
  const toastMessage = initialData ? 'Terminal updated.' : 'Terminal created.';
  const action = initialData ? 'Save changes' : 'Create';

  const form = useForm<TerminalFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
        ...initialData,
        description: initialData.description ?? undefined,
    } : {
      name: '',
      description: undefined,
      isActive: true,
    }
  });

  const onSubmit = async (data: TerminalFormValues) => {
    try {
      setLoading(true);
      if (initialData) {
        await axios.patch(`/api/${params.businessUnitId}/terminals/${params.terminalId}`, data);
      } else {
        await axios.post(`/api/${params.businessUnitId}/terminals`, data);
      }
      router.refresh();
      router.push(`/${params.businessUnitId}/terminals`);
      toast.success(toastMessage);
    } catch (error) {
      toast.error(`Something went wrong. ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => { /* ... delete logic similar to previous forms ... */ };

  return (
    <>
      <AlertModal isOpen={open} onClose={() => setOpen(false)} onConfirm={onDelete} loading={loading} />
      <div className="flex items-center justify-between">
        <Heading title={title} description={initialData ? 'Edit an existing terminal.' : 'Add a new POS terminal.'} />
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
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input disabled={loading} placeholder="e.g., Main Counter" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea disabled={loading} placeholder="Terminal location or purpose" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="isActive" render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <div className="space-y-1 leading-none">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>This terminal will be available for making orders.</FormDescription>
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