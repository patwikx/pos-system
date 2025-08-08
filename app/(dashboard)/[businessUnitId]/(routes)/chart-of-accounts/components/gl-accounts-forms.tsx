"use client"

import * as z from "zod"
import axios from "axios"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Trash } from "lucide-react"
import { AccountType } from "@prisma/client"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { Heading } from "@/components/ui/heading"
import { AlertModal } from "@/components/modals/alert-modal"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GlAccountWithType } from "@/types/acctg-types"

const formSchema = z.object({
  accountCode: z.string().min(1, { message: "Account code is required." }),
  name: z.string().min(1, { message: "Account name is required." }),
  accountTypeId: z.string().min(1, { message: "Please select an account type." }),
  balance: z.number().optional(),
});

type AccountFormValues = z.infer<typeof formSchema>

interface AccountFormProps {
  initialData: GlAccountWithType | null;
  accountTypes: AccountType[];
}

export const AccountForm: React.FC<AccountFormProps> = ({ initialData, accountTypes }) => {
  const params = useParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const title = initialData ? 'Edit Account' : 'Create Account';
  const description = initialData ? 'Edit an existing GL account.' : 'Add a new account to your chart of accounts.';
  const toastMessage = initialData ? 'Account updated.' : 'Account created.';
  const action = initialData ? 'Save changes' : 'Create';

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      accountCode: initialData.accountCode,
      name: initialData.name,
      accountTypeId: initialData.accountTypeId,
      balance: initialData.balance,
    } : {
      accountCode: '',
      name: '',
      accountTypeId: '',
      balance: 0,
    }
  });

  const onSubmit = async (data: AccountFormValues) => {
    try {
      setLoading(true);
      if (initialData) {
        await axios.patch(`/api/${params.businessUnitId}/chart-of-accounts/${initialData.id}`, data);
      } else {
        await axios.post(`/api/${params.businessUnitId}/chart-of-accounts`, data);
      }
      router.refresh();
      router.push(`/${params.businessUnitId}/chart-of-accounts`);
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
      await axios.delete(`/api/${params.businessUnitId}/chart-of-accounts/${initialData?.id}`);
      router.refresh();
      router.push(`/${params.businessUnitId}/chart-of-accounts`);
      toast.success('Account deleted.');
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
        <Heading title={title} description={description} />
        {initialData && (
          <Button disabled={loading} variant="destructive" size="sm" onClick={() => setOpen(true)}>
            <Trash className="h-4 w-4" />
          </Button>
        )}
      </div>
      <Separator />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
          <Card>
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="accountCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Code</FormLabel>
                    <FormControl>
                      <Input disabled={loading || !!initialData} placeholder="e.g., 1000, 2000, 4000" {...field} />
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
                    <Select disabled={loading} onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
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
            </CardContent>
          </Card>

          <Button disabled={loading} className="ml-auto" type="submit">
            {action}
          </Button>
        </form>
      </Form>
    </>
  );
};