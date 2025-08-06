"use client"

import * as z from "zod"
import axios from "axios"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Trash } from "lucide-react"
import { Table, TableStatus } from "@prisma/client"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { Heading } from "@/components/ui/heading"
import { AlertModal } from "@/components/modals/alert-modal"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const formSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  status: z.nativeEnum(TableStatus),
});

type TableFormValues = z.infer<typeof formSchema>

interface TableFormProps {
  initialData: Table | null;
};

export const TableForm: React.FC<TableFormProps> = ({ initialData }) => {
  const params = useParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const title = initialData ? 'Edit table' : 'Create table';
  const toastMessage = initialData ? 'Table updated.' : 'Table created.';
  const action = initialData ? 'Save changes' : 'Create';

  const form = useForm<TableFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      name: '',
      status: 'AVAILABLE',
    }
  });

  const onSubmit = async (data: TableFormValues) => {
    try {
      setLoading(true);
      if (initialData) {
        await axios.patch(`/api/${params.businessUnitId}/tables/${params.tableId}`, data);
      } else {
        await axios.post(`/api/${params.businessUnitId}/tables`, data);
      }
      router.refresh();
      router.push(`/${params.businessUnitId}/tables`);
      toast.success(toastMessage);
    } catch (error) {
      toast.error(`Something went wrong. ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => { /* ... delete logic ... */ };

  return (
    <>
      <AlertModal isOpen={open} onClose={() => setOpen(false)} onConfirm={onDelete} loading={loading} />
      <div className="flex items-center justify-between">
        <Heading title={title} description={initialData ? 'Edit an existing table.' : 'Add a new table.'} />
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
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input disabled={loading} placeholder="e.g., Table 5, Booth 2" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select disabled={loading} onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select a status" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(TableStatus).map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}/>
          </div>
          <Button disabled={loading} className="ml-auto" type="submit">{action}</Button>
        </form>
      </Form>
    </>
  );
};