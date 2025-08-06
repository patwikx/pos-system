"use client"

import * as z from "zod"
import axios from "axios"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Trash, Plus, Loader2 } from 'lucide-react'
import { UoM } from "@prisma/client"
import { useRouter } from "next/navigation"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { AlertModal } from "@/components/modals/alert-modal"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const formSchema = z.object({
  UoM: z.string().min(2),
});

type UoMFormValues = z.infer<typeof formSchema>

interface UoMDialogProps {
  initialData?: UoM | null;
  storeId: string;
};

export const UoMDialog: React.FC<UoMDialogProps> = ({
  initialData,
  storeId
}) => {
  const router = useRouter();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const title = initialData ? 'Edit UoM' : 'Create UoM';
  const description = initialData ? 'Edit a UoM.' : 'Add a new UoM';
  const toastMessage = initialData ? 'UoM updated.' : 'UoM created.';
  const action = initialData ? 'Save changes' : 'Create';

  const form = useForm<UoMFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      UoM: ''
    }
  });

  const onSubmit = async (data: UoMFormValues) => {
    try {
      setLoading(true);
      if (initialData) {
        await axios.patch(`/api/${storeId}/uom/${initialData.id}`, data);
      } else {
        await axios.post(`/api/${storeId}/uom`, data);
      }
      router.refresh();
      setOpen(false);
      toast({
        title: toastMessage,
        description: "Your UoM has been " + (initialData ? "updated" : "created") + " successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/${storeId}/uom/${initialData?.id}`);
      router.refresh();
      setOpen(false);
      toast({
        title: "Unit of Measure Deleted",
        description: "Unit of Measure successfully deleted.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Make sure you removed all products using this UoM first.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
      <Dialog>
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Add UoM
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="UoM"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input disabled={loading} placeholder="UoM name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-between">
                <Button disabled={loading} type="submit">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Please wait
                    </>
                  ) : (
                    action
                  )}
                </Button>
                {initialData && (
                  <Button
                    disabled={loading}
                    variant="destructive"
                    type="button"
                    onClick={() => setOpen(true)}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};

