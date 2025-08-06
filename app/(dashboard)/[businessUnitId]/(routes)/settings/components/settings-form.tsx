"use client"

import * as z from "zod"
import axios from "axios"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Trash } from "lucide-react"
import { BusinessUnit } from "@prisma/client"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { Heading } from "@/components/ui/heading"
import { AlertModal } from "@/components/modals/alert-modal"
//import { ApiAlert } from "@/components/ui/api-alert"

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
});

type SettingsFormValues = z.infer<typeof formSchema>

interface SettingsFormProps {
  initialData: BusinessUnit;
};

export const SettingsForm: React.FC<SettingsFormProps> = ({ initialData }) => {
  const params = useParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData
  });

  const onSubmit = async (data: SettingsFormValues) => {
    try {
      setLoading(true);
      await axios.patch(`/api/business-units/${params.businessUnitId}`, data);
      router.refresh(); // Refreshes server components to show the updated name
      toast.success('Business unit updated.');
    } catch (error) {
      toast.error( `Update failed. Please try again. ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/business-units/${params.businessUnitId}`);
      router.refresh();
      // After deleting, redirect to the root page. The root layout will handle finding the next available unit.
      router.push('/'); 
      toast.success('Business unit deleted.');
    } catch (error) {
      toast.error(`Deletion failed. Please try again. ${error}`);
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
        <Heading title="Business Unit Settings" description="Manage your business unit preferences" />
        <Button
          disabled={loading}
          variant="destructive"
          size="sm"
          onClick={() => setOpen(true)}
        >
          <Trash className="h-4 w-4" />
        </Button>
      </div>
      <Separator />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
          <div className="grid grid-cols-3 gap-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input disabled={loading} placeholder="Business unit name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button disabled={loading} className="ml-auto" type="submit">
            Save changes
          </Button>
        </form>
      </Form>

      {/*
      <Separator />
      <ApiAlert 
        title="NEXT_PUBLIC_API_URL"
        variant="public"
        description={`${process.env.NEXT_PUBLIC_API_URL}/business-units/${params.businessUnitId}`}
      />
      */}
    </>
  );
};