"use client";

import React, { useState, useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { createPurchaseOrder } from '@/lib/actions/pr-po-actions'; // Changed from createPurchaseOrderFromPR
import type {
  PurchaseRequestWithDetails,
  CreatePurchaseOrderData,
  BusinessPartnerOption, // Changed from SupplierOption
  InventoryItemOption,
  GlAccountOption,
  UoMOption,
} from '@/types/pr-po-types';
import { Combobox } from '@/components/reusable-combobox';

// The form data structure matches the API payload.
interface FormData extends CreatePurchaseOrderData {}

interface CreatePurchaseOrderDialogProps {
  purchaseRequest: PurchaseRequestWithDetails;
  onSuccess?: () => void;
  // All necessary data is now passed in as props
  vendors: BusinessPartnerOption[]; // Changed from suppliers
  inventoryItems: InventoryItemOption[];
  expenseAccounts: GlAccountOption[];
  uoms: UoMOption[]; // Keep for display, but not passed to PO item creation
}

export function CreatePurchaseOrderDialog({
  purchaseRequest,
  onSuccess,
  vendors, // Changed from suppliers
  inventoryItems,
  expenseAccounts,
  uoms,
}: CreatePurchaseOrderDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inventoryOptions = useMemo(() => inventoryItems.map(i => ({ value: i.id, label: i.name })), [inventoryItems]);
  const expenseOptions = useMemo(() => expenseAccounts.map(a => ({ value: a.id, label: `${a.accountCode} - ${a.name}` })), [expenseAccounts]); // Added accountCode
  const vendorOptions = useMemo(() => vendors.map(v => ({ value: v.bpCode, label: `${v.bpCode} - ${v.name}` })), [vendors]); // Changed from supplierOptions, using bpCode

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      purchaseRequestId: purchaseRequest.id,
      businessUnitId: purchaseRequest.businessUnitId,
      bpCode: '', // Changed from supplierId
      ownerId: '', // Added ownerId as it's required for CreatePurchaseOrderData
      postingDate: new Date(), // Added postingDate
      deliveryDate: new Date(), // Added deliveryDate
      documentDate: new Date(), // Added documentDate
      totalAmount: 0, // Will be calculated
      items: purchaseRequest.items.map(item => ({
        description: item.description,
        inventoryItemId: '', // Starts blank, to be filled by user
        glAccountId: '', // Changed from expenseAccountId, starts blank, to be filled by user
        quantity: item.requestedQuantity,
        unitPrice: 0, // Changed from unitCost, starts blank, to be filled by user
        lineTotal: 0, // Will be calculated
      })),
    }
  });

  const { fields } = useFieldArray({
    control,
    name: 'items'
  });

  const watchedItems = watch('items');
  const watchedBpCode = watch('bpCode'); // Watch bpCode for validation
  const watchedOwnerId = watch('ownerId'); // Watch ownerId for validation

  const onSubmit = async (data: FormData) => {
    if (!data.bpCode) { // Changed from supplierId
      toast.error('Please select a vendor.');
      return;
    }
    if (!data.ownerId) { // Validate ownerId
      toast.error('Please select an owner.');
      return;
    }

    for (const item of data.items) {
      if (!item.inventoryItemId && !item.glAccountId) { // Changed from expenseAccountId
        toast.error(`Please link an inventory item or GL account for "${item.description}".`);
        return;
      }
      if (item.unitPrice <= 0) { // Changed from unitCost
        toast.error(`Please enter a valid unit price for "${item.description}".`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Ensure totalAmount is correctly calculated before submission
      const totalAmount = calculateTotal();
      const dataToSubmit: CreatePurchaseOrderData = {
        ...data,
        totalAmount: totalAmount,
        // Ensure items are mapped correctly to match CreatePurchaseOrderItemData
        items: data.items.map(item => ({
          description: item.description,
          inventoryItemId: item.inventoryItemId || undefined,
          glAccountId: item.glAccountId || undefined, // Changed from expenseAccountId
          quantity: item.quantity,
          unitPrice: item.unitPrice, // Changed from unitCost
          lineTotal: item.quantity * item.unitPrice, // Recalculate lineTotal for submission
        })),
      };

      const result = await createPurchaseOrder(dataToSubmit); // Changed from createPurchaseOrderFromPR
      if (result.success) {
        toast.success(result.message || 'Purchase order created successfully!');
        setIsOpen(false);
        reset();
        onSuccess?.();
      } else {
        toast.error(result.error || 'Failed to create purchase order.');
      }
    } catch (error) {
      console.error("Error creating PO:", error);
      toast.error('An unexpected error occurred while creating the PO.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateTotal = () => {
    return watchedItems.reduce((total, item) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0; // Changed from unitCost
      return total + (quantity * unitPrice);
    }, 0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700">
          <ShoppingBag className="h-4 w-4 mr-2" />
          Create Purchase Order
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Create PO from {purchaseRequest.prNumber}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} id="po-form" className="flex-grow overflow-y-auto pr-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Supplier Information</CardTitle></CardHeader>
            <CardContent>
              <Label htmlFor="bpCode">Vendor <span className="text-red-500">*</span></Label> {/* Changed from supplierId */}
              <Controller
                control={control}
                name="bpCode" // Changed from supplierId
                rules={{ required: "Vendor is required" }}
                render={({ field }) => (
                  <Combobox
                    options={vendorOptions}
                    placeholder="Select a vendor..."
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.bpCode && <p className="text-sm text-red-500 mt-1">{errors.bpCode.message}</p>} {/* Changed from supplierId */}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">Order Items</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Requested Item</TableHead>
                      <TableHead className="w-[25%]">Link To</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right w-[150px]">Unit Price</TableHead> {/* Changed from Unit Cost */}
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => {
                      const total = (watchedItems[index]?.quantity || 0) * (watchedItems[index]?.unitPrice || 0); // Changed from unitCost
                      return (
                        <TableRow key={field.id}>
                          <TableCell className="font-medium">{field.description}</TableCell>
                          <TableCell>
                            {/* This is the crucial part: the user links the item here */}
                            <Controller
                              control={control}
                              name={`items.${index}.inventoryItemId`}
                              render={({ field: invField }) => (
                                <Combobox
                                  options={inventoryOptions}
                                  placeholder="Link to Inventory..."
                                  value={invField.value}
                                  onChange={(value) => {
                                    invField.onChange(value);
                                    setValue(`items.${index}.glAccountId`, ''); // Clear other link
                                  }}
                                />
                              )}
                            />
                            <div className="text-center text-xs text-muted-foreground my-1">OR</div>
                            <Controller
                              control={control}
                              name={`items.${index}.glAccountId`} // Changed from expenseAccountId
                              render={({ field: glField }) => ( // Changed from expField
                                <Combobox
                                  options={expenseOptions}
                                  placeholder="Link to GL Account..." // Changed from Expense
                                  value={glField.value}
                                  onChange={(value) => {
                                    glField.onChange(value); // Changed from expField.onChange
                                    setValue(`items.${index}.inventoryItemId`, ''); // Clear other link
                                  }}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell className="text-right">{field.quantity}</TableCell>
                          <TableCell>{purchaseRequest.items[index].uom?.symbol || 'N/A'}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min="0.01"
                              step="any"
                              className="w-full ml-auto text-right"
                              placeholder="0.00"
                              {...register(`items.${index}.unitPrice`, { // Changed from unitCost
                                valueAsNumber: true,
                                required: 'Price is required', // Changed from Cost
                                min: { value: 0.01, message: 'Price > 0' } // Changed from Cost
                              })}
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ₱{total.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end mt-4 pt-4 border-t">
                <div className="text-right font-bold text-lg">
                  Total: ₱{calculateTotal().toFixed(2)}
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
        <div className="flex justify-end gap-4 pt-4 mt-auto border-t">
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button type="submit" form="po-form" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Purchase Order'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
