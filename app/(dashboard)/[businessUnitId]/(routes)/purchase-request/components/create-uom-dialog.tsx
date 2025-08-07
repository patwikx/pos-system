"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { UoMOption } from '@/types/pr-po-types';
import { Loader2 } from 'lucide-react';
import { createUom } from '@/lib/actions/pr-po-actions';

interface CreateUomDialogProps {
  onUomCreated: (newUom: UoMOption) => void;
  children: React.ReactNode;
}

interface UomFormData {
  name: string;
  symbol: string;
}

export function CreateUomDialog({ onUomCreated, children }: CreateUomDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UomFormData>();

  const onSubmit = async (data: UomFormData) => {
    setIsSubmitting(true);
    try {
      const result = await createUom(data);
      if (result.success && result.data) {
        toast.success(`UoM "${result.data.name}" created successfully.`);
        onUomCreated(result.data);
        reset();
        setIsOpen(false);
      } else {
        toast.error(result.error || 'Failed to create UoM.');
      }
    } catch (error) {
      console.error("Error creating UoM:", error); // Added console.error for debugging
      toast.error('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {children}
      <DialogContent className="sm:max-w-md rounded-xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Create New Unit of Measure</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} id="uom-form" className="space-y-5">
          <div className="grid gap-2">
            <Label htmlFor="name" className="text-sm font-medium">UoM Name</Label>
            <Input
              id="name"
              placeholder="e.g., Piece, Box, Kilogram"
              {...register('name', { required: 'Name is required' })}
              className={`transition border ${errors.name ? 'border-red-500' : 'border-input'}`}
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="symbol" className="text-sm font-medium">Symbol</Label>
            <Input
              id="symbol"
              placeholder="e.g., pc, box, kg"
              {...register('symbol', { required: 'Symbol is required' })}
              className={`transition border ${errors.symbol ? 'border-red-500' : 'border-input'}`}
            />
            {errors.symbol && <p className="text-sm text-red-500">{errors.symbol.message}</p>}
          </div>
        </form>
        <DialogFooter className="pt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="rounded-md">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="submit"
            form="uom-form"
            disabled={isSubmitting}
            className="rounded-md"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                Creating...
              </>
            ) : (
              'Create UoM'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
