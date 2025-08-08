"use client"

import * as z from "zod"
import axios from "axios"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { CalendarIcon } from "lucide-react"
import { AccountingPeriod } from "@prisma/client"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { format } from "date-fns"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { Heading } from "@/components/ui/heading"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  startDate: z.date({ message: "A start date is required." }),
  endDate: z.date({ message: "An end date is required." }),
  status: z.string().min(1, { message: "Please select a status." }),
}).refine((data) => data.startDate < data.endDate, {
  message: "End date must be after start date.",
  path: ["endDate"],
});

type PeriodFormValues = z.infer<typeof formSchema>

interface PeriodFormProps { 
  initialData: AccountingPeriod | null; 
}

export const AccountingPeriodForm: React.FC<PeriodFormProps> = ({ initialData }) => {
  const params = useParams();
  const router = useRouter();
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
        await axios.patch(`/api/${params.businessUnitId}/accounting-periods/${initialData.id}`, data);
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

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading title={title} description={descriptionText} />
      </div>
      <Separator />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
          <div className="md:grid md:grid-cols-2 gap-8">
            <FormField 
              control={form.control} 
              name="name" 
              render={({ field }) => ( 
                <FormItem>
                  <FormLabel>Period Name</FormLabel>
                  <FormControl>
                    <Input disabled={loading} placeholder="e.g., January 2025, Q1 2025" {...field} />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for this accounting period
                  </FormDescription>
                  <FormMessage />
                </FormItem> 
              )}
            />
            <FormField 
              control={form.control} 
              name="status" 
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select disabled={loading} onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="OPEN">OPEN</SelectItem>
                      <SelectItem value="CLOSED">CLOSED</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Open periods allow transactions, closed periods are locked
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField 
              control={form.control} 
              name="startDate" 
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Start Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button 
                          variant="outline" 
                          className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                        >
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar 
                        mode="single" 
                        selected={field.value} 
                        onSelect={field.onChange} 
                        disabled={(date) => date < new Date("1900-01-01")} 
                        initialFocus 
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField 
              control={form.control} 
              name="endDate" 
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>End Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button 
                          variant="outline" 
                          className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                        >
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar 
                        mode="single" 
                        selected={field.value} 
                        onSelect={field.onChange} 
                        disabled={(date) => date < new Date("1900-01-01")} 
                        initialFocus 
                      />
                    </PopoverContent>
                  </Popover>
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