"use client";

import React, { useState, useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from '@/components/ui/separator';
import { Trash2, Plus, Building2, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { createPurchaseRequest } from '@/lib/actions/pr-po-actions';
import type { CreatePurchaseRequestData, UoMOption } from '@/types/pr-po-types';
import { Combobox } from '@/components/reusable-combobox';
import { DialogTrigger } from '@/components/ui/dialog';
import { CreateUomDialog } from './create-uom-dialog';

interface FormItem {
  description: string;
  requestedQuantity: number;
  notes?: string;
  uomId?: string;
}

interface FormData {
  businessUnitId: string;
  notes?: string;
  items: FormItem[];
}

interface CreatePurchaseRequestFormProps {
  onSuccess?: () => void;
  currentUserId: string;
  businessUnitId: string;
  businessUnitName: string;
  initialUoMs: UoMOption[];
}

export function CreatePurchaseRequestForm({
  onSuccess,
  currentUserId,
  businessUnitId,
  businessUnitName,
  initialUoMs = [],
}: CreatePurchaseRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  // State to manage the dynamic list of UoMs
  const [uoms, setUoms] = useState(initialUoMs);

  // Memoized options now use the state variable and the new label format
  const uomOptions = useMemo(() =>
    uoms.map(uom => ({ value: uom.id, label: `${uom.name} (${uom.symbol})` })),
    [uoms]
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors }, // Added errors to display validation messages
  } = useForm<FormData>({
    defaultValues: {
      businessUnitId: businessUnitId,
      notes: '',
      items: [{
          description: '',
          requestedQuantity: 1,
          notes: '',
          uomId: '',
      }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const onSubmit = async (data: FormData) => {
    if (data.items.length === 0) {
      toast.error('Please add at least one item.');
      return;
    }
    for (const item of data.items) {
      if (!item.description) {
        toast.error('All items must have a description.');
        return;
      }
      if (item.requestedQuantity <= 0) { // Added validation for quantity
        toast.error(`Quantity for item "${item.description || 'an item'}" must be greater than 0.`);
        return;
      }
    }

    setIsSubmitting(true);

    const apiData: CreatePurchaseRequestData = data;
    try {
      const result = await createPurchaseRequest(apiData, currentUserId);
      if (result.success) {
        toast.success(result.message);
        reset({
            businessUnitId: businessUnitId,
            notes: '',
            items: [{ description: '', requestedQuantity: 1, notes: '', uomId: '' }]
        });
        onSuccess?.();
      } else {
        toast.error(result.error || 'Failed to create purchase request.');
      }
    } catch (error) {
      console.error("Error submitting PR:", error); // Added console.error for debugging
      toast.error('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addItem = () => {
    append({
      description: '',
      requestedQuantity: 1,
      notes: '',
      uomId: '',
    });
  };

  const removeItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  // Function to handle the creation of a new UoM
  const handleUomCreated = (newUom: UoMOption) => {
    setUoms(currentUoms => [...currentUoms, newUom]);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Request Details</h3>
        <Separator />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div>
            <Label>Business Unit</Label>
            <div className="flex items-center h-10 px-3 mt-2 border rounded-md bg-muted text-sm">
              <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
              <span className="font-medium">{businessUnitName}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Items</h3>
        <Separator />
        <div className="border rounded-md">
          <div className="max-h-[340px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[100px]">Qty</TableHead>
                  <TableHead className="w-[200px]">Unit</TableHead>
                  <TableHead className="w-[25%]">Notes (Optional)</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => (
                  <TableRow key={field.id} className="align-top">
                    <TableCell className="w-[50px] font-medium text-muted-foreground pt-4">{index + 1}</TableCell>
                    <TableCell>
                      <Input
                        {...register(`items.${index}.description`, { required: "Description is required" })} // Added validation
                        placeholder="e.g., Box of A4 paper, Beef patties"
                        className={errors.items?.[index]?.description ? "border-destructive" : ""}
                      />
                      {errors.items?.[index]?.description && (
                        <p className="text-sm text-destructive mt-1">{errors.items[index].description.message}</p>
                      )}
                    </TableCell>
                    <TableCell className="w-[100px]">
                      <Input
                        type="number"
                        min="0.1"
                        step="any"
                        {...register(`items.${index}.requestedQuantity`, {
                          valueAsNumber: true,
                          required: "Quantity is required",
                          min: { value: 0.1, message: "Quantity must be greater than 0" }
                        })}
                        className={errors.items?.[index]?.requestedQuantity ? "border-destructive" : ""}
                      />
                      {errors.items?.[index]?.requestedQuantity && (
                        <p className="text-sm text-destructive mt-1">{errors.items[index].requestedQuantity.message}</p>
                      )}
                    </TableCell>
                    <TableCell className="w-[200px]">
                      <Controller
                        control={control}
                        name={`items.${index}.uomId`}
                        render={({ field }) => (
                          <Combobox
                            options={uomOptions}
                            placeholder="Unit"
                            value={field.value}
                            onChange={field.onChange}
                            addNewButton={
                              <CreateUomDialog onUomCreated={handleUomCreated}>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" className="w-full justify-start text-sm p-2 h-auto">
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add New UoM
                                  </Button>
                                </DialogTrigger>
                              </CreateUomDialog>
                            }
                          />
                        )}
                      />
                    </TableCell>
                    <TableCell className="w-[25%]">
                      <Input
                        {...register(`items.${index}.notes`)}
                        placeholder="e.g., For accounting office"
                      />
                    </TableCell>
                    <TableCell className="w-[50px] text-right">
                      <Button type="button" onClick={() => removeItem(index)} variant="ghost" size="icon" disabled={fields.length === 1} className="text-red-500 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-2">
          <Button type="button" onClick={addItem} variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Add Item
          </Button>
        </div>
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea {...register('notes')} placeholder="Overall notes for this request..." className="mt-2" />
        </div>
      </div>
      <div className="flex justify-end pt-4 border-t">
        <Button type="submit" disabled={isSubmitting} size="lg">
          {isSubmitting ? 'Submitting...' : 'Submit Purchase Request'}
        </Button>
      </div>
    </form>
  );
}
