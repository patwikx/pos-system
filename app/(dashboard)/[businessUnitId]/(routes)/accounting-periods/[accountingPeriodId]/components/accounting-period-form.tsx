"use client"

import * as z from "zod"
import axios from "axios"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Trash, CalendarIcon } from "lucide-react"
import { AccountingPeriod } from "@prisma/client"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { format } from "date-fns"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { Heading } from "@/components/ui/heading"
import { AlertModal } from "@/components/modals/alert-modal"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  startDate: z.date({ message: "A start date is required." }),
  endDate: z.date({ message: "An end date is required." }),
  status: z.string().min(1, { message: "Please select a status." }),
});

type PeriodFormValues = z.infer<typeof formSchema>

interface PeriodFormProps { initialData: AccountingPeriod | null; };

export const AccountingPeriodForm: React.FC<PeriodFormProps> = ({ initialData }) => {
  const params = useParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const title = initialData ? 'Edit period' : 'Create period';
  const descriptionText = initialData ? 'Edit an existing accounting period.' : 'Add a new period to close your books.';
  const toastMessage = initialData ? 'Period updated.' : 'Period created.';
  const action = initialData ? 'Save changes' : 'Create';

  const form = useForm<PeriodFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || { 
        name: '', 
        status: 'OPEN',
        startDate: undefined,
        endDate: undefined,
    }
  });

  const onSubmit = async (data: PeriodFormValues) => {
    try {
      setLoading(true);
      if (initialData) {
        await axios.patch(`/api/${params.businessUnitId}/accounting-periods/${params.accountingPeriodId}`, data);
      } else {
        await axios.post(`/api/${params.businessUnitId}/accounting-periods`, data);
      }
      router.refresh();
      router.push(`/${params.businessUnitId}/accounting-periods`);
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
        await axios.delete(`/api/${params.businessUnitId}/accounting-periods/${params.accountingPeriodId}`);
        router.refresh();
        router.push(`/${params.businessUnitId}/accounting-periods`);
        toast.success('Period deleted.');
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
        <Heading title={title} description={descriptionText} />
        {initialData && (
          <Button 
            disabled={loading || initialData.status === 'CLOSED'} 
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
          <div className="md:grid md:grid-cols-4 gap-8">
            <FormField control={form.control} name="name" render={({ field }) => ( 
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input disabled={loading} placeholder="e.g., August 2025, Q3 2025" {...field} /></FormControl><FormMessage /></FormItem> 
            )}/>
            <FormField control={form.control} name="startDate" render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                                <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? (format(field.value, "PPP")) : (<span>Pick a date</span>)}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date("1900-01-01")} initialFocus />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
            )}/>
            <FormField control={form.control} name="endDate" render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>End Date</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                                <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? (format(field.value, "PPP")) : (<span>Pick a date</span>)}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date("1900-01-01")} initialFocus />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
            )}/>
            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select disabled={loading || initialData?.status === 'CLOSED'} onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select a status" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="OPEN">OPEN</SelectItem>
                    <SelectItem value="CLOSED">CLOSED</SelectItem>
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