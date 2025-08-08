"use client"

import * as z from "zod"
import axios from "axios"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { Heading } from "@/components/ui/heading"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GlAccountOption } from "@/types/financials-types"

const formSchema = z.object({
  name: z.string().min(1, { message: "Account name is required." }),
  bankName: z.string().min(1, { message: "Bank name is required." }),
  accountNumber: z.string().min(1, { message: "Account number is required." }),
  glAccountId: z.string().min(1, { message: "Please select a GL account." }),
});

type BankAccountFormValues = z.infer<typeof formSchema>

interface BankAccountFormProps {
  assetAccounts: GlAccountOption[];
}

export const BankAccountForm: React.FC<BankAccountFormProps> = ({ assetAccounts }) => {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<BankAccountFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      bankName: '',
      accountNumber: '',
      glAccountId: '',
    }
  });

  const onSubmit = async (data: BankAccountFormValues) => {
    try {
      setLoading(true);
      await axios.post(`/api/${params.businessUnitId}/bank-accounts`, data);
      router.push(`/${params.businessUnitId}/bank-accounts`);
      toast.success('Bank account created successfully.');
    } catch (error: any) {
      toast.error(error.response?.data || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading title="Create Bank Account" description="Add a new bank account to track cash transactions" />
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
                  <FormLabel>Account Name</FormLabel>
                  <FormControl>
                    <Input disabled={loading} placeholder="e.g., Main Operating Account" {...field} />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for this bank account
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bankName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank Name</FormLabel>
                  <FormControl>
                    <Input disabled={loading} placeholder="e.g., BDO, BPI, Metrobank" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="accountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Number</FormLabel>
                  <FormControl>
                    <Input disabled={loading} placeholder="1234567890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="glAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GL Account</FormLabel>
                  <Select disabled={loading} onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select GL account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {assetAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.accountCode} - {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Link this bank account to a GL account for automatic posting
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button disabled={loading} type="submit">
            Create Bank Account
          </Button>
        </form>
      </Form>
    </>
  );
};