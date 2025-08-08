"use client"

import * as z from "zod"
import axios from "axios"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { AccountType } from "@prisma/client"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { Heading } from "@/components/ui/heading"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const formSchema = z.object({
  accountCode: z.string().min(1, { message: "Account code is required." }),
  name: z.string().min(1, { message: "Account name is required." }),
  accountTypeId: z.string().min(1, { message: "Please select an account type." }),
  balance: z.number().optional(),
});

type AccountFormValues = z.infer<typeof formSchema>

interface AccountFormProps {
  initialData: null;
  accountTypes: AccountType[];
}

export const AccountForm: React.FC<AccountFormProps> = ({ accountTypes }) => {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accountCode: '',
      name: '',
      accountTypeId: '',
      balance: 0,
    }
  });

  const onSubmit = async (data: AccountFormValues) => {
    try {
      setLoading(true);
      await axios.post(`/api/${params.businessUnitId}/chart-of-accounts`, data);
      router.refresh();
      router.push(`/${params.businessUnitId}/chart-of-accounts`);
      toast.success('Account created successfully.');
    } catch (error: any) {
      toast.error(error.response?.data || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading title="Create Account" description="Add a new account to your chart of accounts" />
      </div>
      <Separator />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
          <div className="md:grid md:grid-cols-2 gap-8">
            <FormField
              control={form.control}
              name="accountCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Code</FormLabel>
                  <FormControl>
                    <Input disabled={loading} placeholder="e.g., 1000, 2000, 4000" {...field} />
                  </FormControl>
                  <FormDescription>
                    Unique identifier for this account (e.g., 1000 for Cash)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name</FormLabel>
                  <FormControl>
                    <Input disabled={loading} placeholder="e.g., Cash on Hand, Sales Revenue" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="accountTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Type</FormLabel>
                  <Select disabled={loading} onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accountTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
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
              name="balance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opening Balance</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      disabled={loading} 
                      placeholder="0.00" 
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Initial balance for this account
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button disabled={loading} type="submit">
            Create Account
          </Button>
        </form>
      </Form>
    </>
  );
};