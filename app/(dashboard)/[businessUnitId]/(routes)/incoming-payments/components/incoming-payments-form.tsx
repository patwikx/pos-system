"use client"

import * as z from "zod"
import axios from "axios"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { CalendarIcon } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { format } from "date-fns"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { Heading } from "@/components/ui/heading"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { BusinessPartnerOption, BankAccountWithDetails } from "@/types/financials-types"

const formSchema = z.object({
  bpCode: z.string().min(1, "Customer is required"),
  paymentDate: z.date(),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  bankAccountId: z.string().min(1, "Bank account is required"),
});

type IncomingPaymentFormValues = z.infer<typeof formSchema>

interface IncomingPaymentFormProps {
  customers: BusinessPartnerOption[];
  bankAccounts: BankAccountWithDetails[];
}

export const IncomingPaymentForm: React.FC<IncomingPaymentFormProps> = ({ 
  customers, 
  bankAccounts 
}) => {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<IncomingPaymentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bpCode: '',
      paymentDate: new Date(),
      amount: 0,
      bankAccountId: '',
    }
  });

  const onSubmit = async (data: IncomingPaymentFormValues) => {
    try {
      setLoading(true);
      await axios.post(`/api/${params.businessUnitId}/incoming-payments`, data);
      router.push(`/${params.businessUnitId}/incoming-payments`);
      toast.success('Incoming payment recorded successfully.');
    } catch (error: any) {
      toast.error(error.response?.data || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading title="Record Incoming Payment" description="Record a payment received from a customer" />
      </div>
      <Separator />
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="bpCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <Select disabled={loading} onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.bpCode} value={customer.bpCode}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="bankAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Account</FormLabel>
                    <Select disabled={loading} onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select bank account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {bankAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name} - {account.bankName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Payment Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
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
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={loading}
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      Amount received from the customer
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button disabled={loading} type="submit">
              Record Payment
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
};