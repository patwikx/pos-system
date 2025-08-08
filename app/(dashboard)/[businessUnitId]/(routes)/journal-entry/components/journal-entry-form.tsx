"use client"

import * as z from "zod"
import axios from "axios"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import { Trash, Plus, CalendarIcon, Calculator } from "lucide-react"
import { GlAccount, JournalEntry } from "@prisma/client"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { format } from "date-fns"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { Heading } from "@/components/ui/heading"
import { AlertModal } from "@/components/modals/alert-modal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { JournalEntryWithDetails } from "@/types/acctg-types"

const journalLineSchema = z.object({
  glAccountCode: z.string().min(1, { message: "Please select an account." }),
  debit: z.number().optional(),
  credit: z.number().optional(),
}).refine((data) => {
  return (data.debit && data.debit > 0) || (data.credit && data.credit > 0);
}, {
  message: "Each line must have either a debit or credit amount.",
});

const formSchema = z.object({
  postingDate: z.date({ message: "Posting date is required." }),
  remarks: z.string().optional(),
  lines: z.array(journalLineSchema).min(2, { message: "Journal entry must have at least 2 lines." }),
}).refine((data) => {
  const totalDebits = data.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredits = data.lines.reduce((sum, line) => sum + (line.credit || 0), 0);
  return Math.abs(totalDebits - totalCredits) < 0.01;
}, {
  message: "Total debits must equal total credits.",
  path: ["lines"]
});

type JournalEntryFormValues = z.infer<typeof formSchema>

interface JournalEntryFormProps {
  initialData: JournalEntryWithDetails | null;
  accounts: GlAccount[];
}

export const JournalEntryForm: React.FC<JournalEntryFormProps> = ({ 
  initialData, 
  accounts 
}) => {
  const params = useParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const title = initialData ? 'Edit Journal Entry' : 'Create Journal Entry';
  const description = initialData ? 'Edit an existing journal entry.' : 'Create a new manual journal entry.';
  const toastMessage = initialData ? 'Journal entry updated.' : 'Journal entry created.';
  const action = initialData ? 'Save changes' : 'Create';

  const form = useForm<JournalEntryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      postingDate: initialData.postingDate,
      remarks: initialData.remarks || undefined,
      lines: initialData.lines.map(line => ({
        glAccountCode: line.glAccountCode,
        debit: line.debit || undefined,
        credit: line.credit || undefined,
      }))
    } : {
      postingDate: new Date(),
      remarks: undefined,
      lines: [
        { glAccountCode: '', debit: undefined, credit: undefined },
        { glAccountCode: '', debit: undefined, credit: undefined },
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines"
  });

  const watchedLines = form.watch("lines");
  const totalDebits = watchedLines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredits = watchedLines.reduce((sum, line) => sum + (line.credit || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  const onSubmit = async (data: JournalEntryFormValues) => {
    try {
      setLoading(true);
      if (initialData) {
        await axios.patch(`/api/${params.businessUnitId}/journal-entry/${initialData.id}`, data);
      } else {
        await axios.post(`/api/${params.businessUnitId}/journal-entry`, data);
      }
      router.refresh();
      router.push(`/${params.businessUnitId}/journal-entry`);
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
      await axios.delete(`/api/${params.businessUnitId}/journal-entry/${initialData?.id}`);
      router.refresh();
      router.push(`/${params.businessUnitId}/journal-entry`);
      toast.success('Journal entry deleted.');
    } catch (error: any) {
      toast.error(error.response?.data || 'Something went wrong.');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  const addLine = () => {
    append({ glAccountCode: '', debit: undefined, credit: undefined });
  };

  const removeLine = (index: number) => {
    if (fields.length > 2) {
      remove(index);
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
          {/* Header Information */}
          <Card>
            <CardHeader>
              <CardTitle>Journal Entry Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="postingDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Posting Date</FormLabel>
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
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remarks</FormLabel>
                    <FormControl>
                      <Textarea 
                        disabled={loading} 
                        placeholder="Description of the journal entry..." 
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Journal Lines */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Journal Lines</CardTitle>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  <Badge variant={isBalanced ? "default" : "destructive"}>
                    {isBalanced ? "Balanced" : "Out of Balance"}
                  </Badge>
                </div>
                <Button type="button" onClick={addLine} variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Line
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right w-[150px]">Debit</TableHead>
                      <TableHead className="text-right w-[150px]">Credit</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell className="font-medium text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`lines.${index}.glAccountCode`}
                            render={({ field }) => (
                              <FormItem>
                                <Select 
                                  disabled={loading} 
                                  onValueChange={field.onChange} 
                                  value={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select account" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {accounts.map((account) => (
                                      <SelectItem key={account.id} value={account.accountCode}>
                                        {account.accountCode} - {account.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`lines.${index}.debit`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    disabled={loading}
                                    placeholder="0.00"
                                    className="text-right"
                                    {...field}
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value) || undefined;
                                      field.onChange(value);
                                      if (value) {
                                        form.setValue(`lines.${index}.credit`, undefined);
                                      }
                                    }}
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`lines.${index}.credit`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    disabled={loading}
                                    placeholder="0.00"
                                    className="text-right"
                                    {...field}
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value) || undefined;
                                      field.onChange(value);
                                      if (value) {
                                        form.setValue(`lines.${index}.debit`, undefined);
                                      }
                                    }}
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLine(index)}
                            disabled={fields.length <= 2 || loading}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals Row */}
                    <TableRow className="border-t-2 font-semibold bg-muted/50">
                      <TableCell></TableCell>
                      <TableCell>Totals</TableCell>
                      <TableCell className="text-right">
                        ₱{totalDebits.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        ₱{totalCredits.toFixed(2)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              
              <div className="flex justify-between items-center mt-4 p-4 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">
                  Difference: ₱{Math.abs(totalDebits - totalCredits).toFixed(2)}
                </div>
                <Badge variant={isBalanced ? "default" : "destructive"}>
                  {isBalanced ? "Entry is balanced" : "Entry is out of balance"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button disabled={loading || !isBalanced} type="submit">
              {action}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
};