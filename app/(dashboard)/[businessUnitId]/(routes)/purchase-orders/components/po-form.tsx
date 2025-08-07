"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ChevronLeft, ChevronRight, FilePlus, Search, Package, DollarSign, Trash2, Plus, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { createPurchaseOrder, updatePurchaseOrder } from '@/lib/actions/pr-po-actions';
import type {
  PurchaseOrderWithDetails,
  PurchaseRequestWithDetails,
  BusinessPartnerOption,
  UserOption,
  InventoryItemOption,
  GlAccountOption,
  CreatePurchaseOrderData,
  CreatePurchaseOrderItemData
} from '@/types/pr-po-types';
import { DocumentStatus } from '@prisma/client';
import { cn } from '@/lib/utils';
import { Combobox } from './po-combobox'; // Assuming this path is correct

// Form data interfaces
interface PurchaseOrderFormData {
  id?: string;
  poNumber?: string;
  status: DocumentStatus;
  businessUnitId: string;
  bpCode: string;
  ownerId: string;
  postingDate: Date;
  deliveryDate: Date;
  documentDate: Date;
  remarks?: string | null;
  totalAmount: number;
  items: PurchaseOrderItemFormData[];
}

interface PurchaseOrderItemFormData {
  id?: string;
  description: string;
  inventoryItemId?: string;
  glAccountId?: string;
  quantity: number; // Ensure this is number
  unitPrice: number; // Ensure this is number
  lineTotal: number;
}

interface PurchaseOrderFormProps {
  initialOrder: PurchaseOrderWithDetails | null;
  orderIds: string[];
  businessUnitId: string;
  currentUserId: string;
  userRole: string;
  vendors: BusinessPartnerOption[];
  users: UserOption[];
  inventoryItems: InventoryItemOption[];
  expenseAccounts: GlAccountOption[];
  selectedPurchaseRequest?: PurchaseRequestWithDetails; // Make this optional
}

export function PurchaseOrderForm({
  initialOrder,
  orderIds,
  businessUnitId,
  currentUserId,
  userRole,
  vendors,
  users,
  inventoryItems,
  expenseAccounts,
  selectedPurchaseRequest
}: PurchaseOrderFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<'view' | 'create' | 'edit'>(initialOrder ? 'view' : 'create');
  const [currentIndex, setCurrentIndex] = useState(initialOrder ? orderIds.indexOf(initialOrder.id) : -1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditable = mode === 'create' || (mode === 'edit' && initialOrder?.status === DocumentStatus.OPEN);

  // Function to determine default form values based on initialOrder or selectedPurchaseRequest
  const getDefaultValues = (): PurchaseOrderFormData => {
    if (initialOrder) {
      return {
        id: initialOrder.id,
        poNumber: initialOrder.poNumber,
        status: initialOrder.status,
        businessUnitId: initialOrder.businessUnit.id,
        bpCode: initialOrder.businessPartner.bpCode,
        ownerId: initialOrder.owner.id,
        postingDate: initialOrder.postingDate,
        deliveryDate: initialOrder.deliveryDate,
        documentDate: initialOrder.documentDate,
        remarks: initialOrder.remarks,
        totalAmount: initialOrder.totalAmount,
        items: initialOrder.items.map(item => ({
          id: item.id,
          description: item.description,
          inventoryItemId: item.inventoryItem?.id,
          glAccountId: item.glAccount?.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        })),
      };
    }
    if (selectedPurchaseRequest) {
      return {
        status: DocumentStatus.OPEN,
        businessUnitId: businessUnitId,
        bpCode: '', // Vendor needs to be selected
        ownerId: currentUserId,
        postingDate: new Date(),
        deliveryDate: new Date(),
        documentDate: new Date(),
        remarks: selectedPurchaseRequest.notes,
        totalAmount: 0, // Will be calculated by useEffect
        items: selectedPurchaseRequest.items.map(item => ({
          description: item.description,
          quantity: item.requestedQuantity,
          unitPrice: 0, // User needs to input unit price
          lineTotal: 0, // Will be calculated
        })),
      };
    }
    // Default for a completely new, blank PO (if your schema allows it)
    return {
      status: DocumentStatus.OPEN,
      businessUnitId: businessUnitId,
      bpCode: '',
      ownerId: currentUserId,
      postingDate: new Date(),
      deliveryDate: new Date(),
      documentDate: new Date(),
      remarks: null,
      totalAmount: 0,
      items: [],
    };
  };

  const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<PurchaseOrderFormData>({
    defaultValues: getDefaultValues()
  });

  const { fields, append, remove } = useFieldArray<PurchaseOrderFormData>({
    control,
    name: "items"
  });

  const watchedItems = watch('items');
  const selectedVendor = vendors.find(v => v.bpCode === watch('bpCode'));
  const selectedOwner = users.find(u => u.id === watch('ownerId'));

  // Calculate totals
  const calculateTotals = useMemo(() => {
    const subtotal = watchedItems?.reduce((sum, item) => sum + (item.lineTotal || 0), 0) || 0;
    const tax = subtotal * 0.12; // 12% VAT
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }, [watchedItems]);

  // Update total amount when items change
  useEffect(() => {
    setValue('totalAmount', calculateTotals.total);
  }, [calculateTotals.total, setValue]);

  // Reset form when initialOrder or selectedPurchaseRequest changes
  useEffect(() => {
    reset(getDefaultValues());
    if (initialOrder) {
      setMode('view');
      setCurrentIndex(orderIds.indexOf(initialOrder.id));
    } else {
      setMode('create');
      setCurrentIndex(-1);
    }
  }, [initialOrder, orderIds, selectedPurchaseRequest, reset]);

  const navigate = (direction: 'next' | 'prev') => {
    const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (newIndex >= 0 && newIndex < orderIds.length) {
      // Navigate to the specific PO ID
      router.push(`/${businessUnitId}/purchase-orders/${orderIds[newIndex]}`);
    }
  };

  const addNewItem = () => {
    append({
      description: '',
      quantity: 1,
      unitPrice: 0,
      lineTotal: 0,
    });
  };

  const updateItemLineTotal = (index: number, quantity: number, unitPrice: number) => {
    const lineTotal = quantity * unitPrice;
    setValue(`items.${index}.lineTotal`, lineTotal);
  };

  const onSubmit = async (data: PurchaseOrderFormData) => {
    setIsSubmitting(true);
    toast.info("Saving purchase order...");

    try {
      if (mode === 'create') {
        const createData: CreatePurchaseOrderData = {
          // Ensure purchaseRequestId is always present if creating from PR
          purchaseRequestId: selectedPurchaseRequest?.id,
          businessUnitId: data.businessUnitId,
          bpCode: data.bpCode,
          ownerId: data.ownerId,
          postingDate: data.postingDate,
          deliveryDate: data.deliveryDate,
          documentDate: data.documentDate,
          remarks: data.remarks || undefined,
          totalAmount: data.totalAmount,
          items: data.items.map(item => ({
            description: item.description,
            inventoryItemId: item.inventoryItemId,
            glAccountId: item.glAccountId,
            quantity: item.quantity, // These are now guaranteed to be numbers from Controller
            unitPrice: item.unitPrice, // These are now guaranteed to be numbers from Controller
            lineTotal: item.lineTotal,
          })),
        };

        // Add validation for purchaseRequestId if it's strictly required by your schema
        if (selectedPurchaseRequest && !createData.purchaseRequestId) {
          toast.error("A Purchase Request must be selected to create a Purchase Order.");
          setIsSubmitting(false);
          return;
        }

        const result = await createPurchaseOrder(createData);
        if (result.success && result.data) {
          toast.success(result.message);
          router.push(`/${businessUnitId}/purchase-orders/${result.data.id}`);
        } else {
          toast.error(result.error || 'Failed to create purchase order');
        }
      } else if (mode === 'edit' && initialOrder) {
        const updateData: PurchaseOrderWithDetails = {
          ...initialOrder,
          businessPartner: { bpCode: data.bpCode, name: selectedVendor?.name || '' },
          owner: { id: data.ownerId, name: selectedOwner?.name || null },
          postingDate: data.postingDate,
          deliveryDate: data.deliveryDate,
          documentDate: data.documentDate,
          remarks: data.remarks || null,
          // Items are not updated via this top-level update, assuming they have their own actions
          items: initialOrder.items, // Keep existing items for type compatibility
          purchaseRequest: initialOrder.purchaseRequest, // Keep existing PR for type compatibility
          businessUnit: initialOrder.businessUnit, // Keep existing BU for type compatibility
          receivings: initialOrder.receivings, // Keep existing receivings for type compatibility
          createdAt: initialOrder.createdAt,
        };

        const result = await updatePurchaseOrder(updateData);
        if (result.success) {
          toast.success(result.message);
          router.refresh();
          setMode('view');
        } else {
          toast.error(result.error || 'Failed to update purchase order');
        }
      }
    } catch (error) {
      console.error("Submission error:", error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: DocumentStatus) => {
    const variants = {
      [DocumentStatus.OPEN]: { variant: 'default', label: 'Open' },
      [DocumentStatus.CLOSED]: { variant: 'secondary', label: 'Closed' },
      [DocumentStatus.CANCELLED]: { variant: 'destructive', label: 'Cancelled' },
    } as const;
    const config = variants[status] || variants[DocumentStatus.OPEN];
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Purchase Request Info Banner */}
      {selectedPurchaseRequest && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">
                Creating Purchase Order from Purchase Request: {selectedPurchaseRequest.prNumber}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 font-medium">Requested by:</span> {selectedPurchaseRequest.requestor.name}
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Request Date:</span> {format(selectedPurchaseRequest.createdAt, 'PPP')}
                </div>
                {selectedPurchaseRequest.notes && (
                  <div className="col-span-full">
                    <span className="text-blue-700 font-medium">Notes:</span> {selectedPurchaseRequest.notes}
                  </div>
                )}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push(`/${businessUnitId}/purchase-orders/new`)}
              className="gap-2"
            >
              <ArrowLeft size={16} />
              Change PR
            </Button>
          </div>
        </div>
      )}
      {/* Toolbar */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => router.push(`/${businessUnitId}/purchase-orders/new`)}
            size="sm"
            className="gap-2"
          >
            <FilePlus size={16}/> New
          </Button>
          <Button
            type="button"
            onClick={() => router.push(`/${businessUnitId}/purchase-orders`)}
            size="sm"
            className="gap-2"
            variant="outline"
          >
            <Search size={16}/> Find
          </Button>
          {mode === 'view' && initialOrder?.status === DocumentStatus.OPEN && (
            <Button
              type="button"
              onClick={() => setMode('edit')}
              size="sm"
              variant="outline"
            >
              Edit
            </Button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => navigate('prev')}
            disabled={currentIndex <= 0}
          >
            <ChevronLeft size={16}/>
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => navigate('next')}
            disabled={currentIndex >= orderIds.length - 1 || currentIndex === -1}
          >
            <ChevronRight size={16}/>
          </Button>
        </div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Header Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side - Vendor Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor *</Label>
              <Controller
                name="bpCode"
                control={control}
                rules={{ required: "Vendor is required" }}
                render={({ field }) => (
                  <Combobox
                    options={vendors.map(v => ({ value: v.bpCode, label: `${v.bpCode} - ${v.name}` }))}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select vendor..."
                    disabled={!isEditable}
                    className={errors.bpCode ? "border-destructive" : ""}
                  />
                )}
              />
              {errors.bpCode && (
                <p className="text-sm text-destructive">{errors.bpCode.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner">Owner *</Label>
              <Controller
                name="ownerId"
                control={control}
                rules={{ required: "Owner is required" }}
                render={({ field }) => (
                  <Combobox
                    options={users.map(u => ({ value: u.id, label: u.name || 'Unknown' }))}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select owner..."
                    disabled={!isEditable}
                    className={errors.ownerId ? "border-destructive" : ""}
                  />
                )}
              />
              {errors.ownerId && (
                <p className="text-sm text-destructive">{errors.ownerId.message}</p>
              )}
            </div>
          </div>

          {/* Right Side - Document Information */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>PO Number</Label>
              <Input
                value={watch('poNumber') || 'NEW'}
                readOnly
                className="w-48 text-right font-mono"
              />
            </div>
            <div className="flex justify-between items-center">
              <Label>Status</Label>
              <div className="w-48 flex justify-end">
                {getStatusBadge(watch('status'))}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <Label>Posting Date *</Label>
              <Controller
                name="postingDate"
                control={control}
                rules={{ required: "Posting date is required" }}
                render={({ field }) => (
                  <DatePicker
                    date={field.value}
                    setDate={field.onChange}
                    disabled={!isEditable}
                  />
                )}
              />
            </div>
            <div className="flex justify-between items-center">
              <Label>Delivery Date *</Label>
              <Controller
                name="deliveryDate"
                control={control}
                rules={{ required: "Delivery date is required" }}
                render={({ field }) => (
                  <DatePicker
                    date={field.value}
                    setDate={field.onChange}
                    disabled={!isEditable}
                  />
                )}
              />
            </div>
            <div className="flex justify-between items-center">
              <Label>Document Date *</Label>
              <Controller
                name="documentDate"
                control={control}
                rules={{ required: "Document date is required" }}
                render={({ field }) => (
                  <DatePicker
                    date={field.value}
                    setDate={field.onChange}
                    disabled={!isEditable}
                  />
                )}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Items Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Package size={20} />
              Items
            </h3>
            {isEditable && (
              <Button type="button" onClick={addNewItem} variant="outline" size="sm">
                <Plus size={16} className="mr-1" />
                Add Item
              </Button>
            )}
          </div>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>GL Account</TableHead>
                  <TableHead className="text-right w-20">Qty</TableHead>
                  <TableHead className="text-right w-28">Unit Price</TableHead>
                  <TableHead className="text-right w-32">Total</TableHead>
                  {isEditable && <TableHead className="w-12"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => (
                  <TableRow key={field.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <Input
                        {...register(`items.${index}.description`, { required: "Description is required" })}
                        placeholder="Item description..."
                        disabled={!isEditable}
                        className={errors.items?.[index]?.description ? "border-destructive" : ""}
                      />
                    </TableCell>
                    <TableCell>
                      <Controller
                        name={`items.${index}.inventoryItemId`}
                        control={control}
                        render={({ field }) => (
                          <Combobox
                            options={inventoryItems.map(i => ({ value: i.id, label: i.name }))}
                            value={field.value || ''}
                            onChange={field.onChange}
                            placeholder="Select item..."
                            disabled={!isEditable}
                          />
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <Controller
                        name={`items.${index}.glAccountId`}
                        control={control}
                        render={({ field }) => (
                          <Combobox
                            options={expenseAccounts.map(a => ({
                              value: a.id,
                              label: `${a.accountCode} - ${a.name}`
                            }))}
                            value={field.value || ''}
                            onChange={field.onChange}
                            placeholder="Select account..."
                            disabled={!isEditable}
                          />
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <Controller
                        name={`items.${index}.quantity`}
                        control={control}
                        rules={{
                          required: "Quantity is required",
                          min: { value: 0.01, message: "Quantity must be greater than 0" }
                        }}
                        render={({ field }) => (
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            min="0"
                            disabled={!isEditable}
                            className="text-right"
                            onChange={(e) => {
                              // Explicitly parse to number
                              const quantity = parseFloat(e.target.value) || 0;
                              const unitPrice = watch(`items.${index}.unitPrice`) || 0;
                              field.onChange(quantity); // Update form state with number
                              updateItemLineTotal(index, quantity, unitPrice);
                            }}
                            value={field.value === 0 ? '' : field.value} // Display empty string for 0 to allow typing
                          />
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <Controller
                        name={`items.${index}.unitPrice`}
                        control={control}
                        rules={{
                          required: "Unit price is required",
                          min: { value: 0, message: "Unit price must be non-negative" }
                        }}
                        render={({ field }) => (
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            min="0"
                            disabled={!isEditable}
                            className="text-right"
                            onChange={(e) => {
                              // Explicitly parse to number
                              const unitPrice = parseFloat(e.target.value) || 0;
                              const quantity = watch(`items.${index}.quantity`) || 0;
                              field.onChange(unitPrice); // Update form state with number
                              updateItemLineTotal(index, quantity, unitPrice);
                            }}
                            value={field.value === 0 ? '' : field.value} // Display empty string for 0 to allow typing
                          />
                        )}
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₱{(watchedItems[index]?.lineTotal || 0).toLocaleString('en-PH', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    {isEditable && (
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {fields.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isEditable ? 8 : 7} className="text-center text-muted-foreground py-8">
                      No items added yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <Separator />

        {/* Footer Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side - Remarks */}
          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              {...register('remarks')}
              placeholder="Additional notes or comments..."
              rows={4}
              disabled={!isEditable}
            />
          </div>

          {/* Right Side - Totals */}
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <span>Subtotal:</span>
                <span className="font-medium">
                  ₱{calculateTotals.subtotal.toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>VAT (12%):</span>
                <span className="font-medium">
                  ₱{calculateTotals.tax.toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total:</span>
                <span>
                  ₱{calculateTotals.total.toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-start gap-2 pt-4 border-t">
          {isEditable && (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (mode === 'create' ? 'Create Purchase Order' : 'Update Purchase Order')}
            </Button>
          )}
          {mode === 'edit' && (
            <Button type="button" variant="outline" onClick={() => setMode('view')}>
              Cancel
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/${businessUnitId}/purchase-orders`)}
          >
            Back to List
          </Button>
        </div>
      </form>
    </div>
  );
}

// Date Picker Helper Component
interface DatePickerProps {
  date: Date;
  setDate: (date: Date) => void;
  disabled?: boolean;
}

const DatePicker: React.FC<DatePickerProps> = ({ date, setDate, disabled }) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button
        variant="outline"
        className={cn(
          "w-48 justify-start text-left font-normal",
          !date && "text-muted-foreground"
        )}
        disabled={disabled}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {date ? format(date, "PPP") : <span>Pick a date</span>}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0">
      <Calendar
        mode="single"
        selected={date}
        onSelect={(newDate) => newDate && setDate(newDate)}
        initialFocus
      />
    </PopoverContent>
  </Popover>
);
