"use server";

import { Prisma, PrismaClient, DocumentType, PurchaseRequestStatus, DocumentStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import {
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
  PurchaseRequestWithDetails,
  PurchaseOrderWithDetails,
  CreatePurchaseRequestData,
  ApprovePurchaseRequestData,
  CreatePurchaseOrderData,
  PurchaseRequestFilters,
  PurchaseOrderFilters,
  UoMOption,
  BusinessPartnerOption,
  GlAccountOption,
  UserOption,
  InventoryItemOption,
  BusinessUnitOption
} from '@/types/pr-po-types';
import { prisma } from "@/lib/prisma"

// --- REUSABLE INCLUDE OBJECTS ---
const purchaseRequestInclude: Prisma.PurchaseRequestInclude = {
  businessUnit: { select: { id: true, name: true } },
  requestor: { select: { id: true, name: true } },
  approver: { select: { id: true, name: true } },
  items: {
    include: {
      uom: { select: { id: true, name: true, symbol: true } },
    }
  },
  purchaseOrder: { select: { id: true, poNumber: true } }
};

const purchaseOrderInclude: Prisma.PurchaseOrderInclude = {
  businessUnit: { select: { id: true, name: true } },
  businessPartner: { select: { bpCode: true, name: true } },
  owner: { select: { id: true, name: true } },
  purchaseRequest: { select: { id: true, prNumber: true } },
  items: {
    include: {
      inventoryItem: { select: { id: true, name: true } },
      glAccount: { select: { id: true, name: true, accountCode: true } },
    }
  },
  receivings: {
    include: {
      receivedBy: { select: { id: true, name: true } }
    }
  }
};

// --- DOCUMENT NUMBERING ---
async function getNextDocNum(docType: DocumentType, businessUnitId: string): Promise<string> {
  const series = await prisma.numberingSeries.findUnique({
    where: { documentType_businessUnitId: { documentType: docType, businessUnitId } }
  });

  if (!series) {
    throw new Error(`Numbering series for ${docType} in business unit ${businessUnitId} not found.`);
  }

  const docNum = `${series.prefix}${series.nextNumber}`;
  
  await prisma.numberingSeries.update({
    where: { id: series.id },
    data: { nextNumber: { increment: 1 } }
  });

  return docNum;
}

// --- PURCHASE REQUEST ACTIONS ---
export async function createPurchaseRequest(
  data: CreatePurchaseRequestData,
  requestorId: string
): Promise<ApiResponse<PurchaseRequestWithDetails>> {
  try {
    const prNumber = await getNextDocNum(DocumentType.PURCHASE_REQUEST, data.businessUnitId);
    
    const purchaseRequest = await prisma.purchaseRequest.create({
      data: {
        prNumber,
        businessUnitId: data.businessUnitId,
        requestorId,
        notes: data.notes,
        items: {
          create: data.items.map(item => ({
            description: item.description,
            requestedQuantity: item.requestedQuantity,
            notes: item.notes,
            uomId: item.uomId || undefined,
          })),
        },
      },
      include: purchaseRequestInclude,
    });

    revalidatePath(`/${data.businessUnitId}/purchase-requests`);
    
    return {
      success: true,
      data: purchaseRequest as unknown as PurchaseRequestWithDetails,
      message: `Purchase Request ${prNumber} created successfully`,
    };
  } catch (error) {
    console.error('Error creating purchase request:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function getPurchaseRequests(
  filters: PurchaseRequestFilters = {},
  pagination: PaginationParams = { page: 1, limit: 10 }
): Promise<PaginatedResponse<PurchaseRequestWithDetails>> {
  try {
    const where: Prisma.PurchaseRequestWhereInput = {};
    
    if (filters.status) where.status = filters.status;
    if (filters.businessUnitId) where.businessUnitId = filters.businessUnitId;
    if (filters.requestorId) where.requestorId = filters.requestorId;
    
    if (filters.searchTerm) {
      where.OR = [
        { prNumber: { contains: filters.searchTerm, mode: 'insensitive' } },
        { requestor: { name: { contains: filters.searchTerm, mode: 'insensitive' } } },
        { items: { some: { description: { contains: filters.searchTerm, mode: 'insensitive' } } } }
      ];
    }

    const [total, data] = await prisma.$transaction([
      prisma.purchaseRequest.count({ where }),
      prisma.purchaseRequest.findMany({
        where,
        include: purchaseRequestInclude,
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: data as unknown as PurchaseRequestWithDetails[],
      pagination: { ...pagination, total, totalPages: Math.ceil(total / pagination.limit) },
    };
  } catch (error) {
    console.error('Error fetching purchase requests:', error);
    return { data: [], pagination: { ...pagination, total: 0, totalPages: 0 } };
  }
}

// NEW: Get available purchase requests for PO creation
export async function getAvailablePurchaseRequests(businessUnitId: string): Promise<PurchaseRequestWithDetails[]> {
  try {
    const requests = await prisma.purchaseRequest.findMany({
      where: {
        businessUnitId,
        status: PurchaseRequestStatus.APPROVED,
        purchaseOrder: null, // No PO created yet
      },
      include: purchaseRequestInclude,
      orderBy: { createdAt: 'desc' },
    });

    return requests as unknown as PurchaseRequestWithDetails[];
  } catch (error) {
    console.error('Error fetching available purchase requests:', error);
    return [];
  }
}

export async function approvePurchaseRequest(
  data: ApprovePurchaseRequestData,
  approverId: string
): Promise<ApiResponse<PurchaseRequestWithDetails>> {
  try {
    const purchaseRequest = await prisma.purchaseRequest.update({
      where: { id: data.id },
      data: {
        status: data.approved ? 'APPROVED' : 'REJECTED',
        approverId,
        approvalDate: new Date(),
      },
      include: purchaseRequestInclude,
    });

    revalidatePath(`/purchase-requests`);
    
    return {
      success: true,
      data: purchaseRequest as unknown as PurchaseRequestWithDetails,
      message: `Purchase request ${data.approved ? 'approved' : 'rejected'}`,
    };
  } catch (error) {
    console.error('Error processing PR approval:', error);
    return { success: false, error: 'Failed to process approval.' };
  }
}

export async function getPurchaseRequestById(id: string): Promise<PurchaseRequestWithDetails | null> {
  try {
    const request = await prisma.purchaseRequest.findUnique({
      where: { id },
      include: purchaseRequestInclude,
    });
    return request as unknown as PurchaseRequestWithDetails | null;
  } catch (error) {
    console.error("Error fetching PR by ID:", error);
    return null;
  }
}

// --- PURCHASE ORDER ACTIONS ---
export async function createPurchaseOrder(
  data: CreatePurchaseOrderData
): Promise<ApiResponse<PurchaseOrderWithDetails>> {
  try {
    if (!data.purchaseRequestId) {
      return { success: false, error: 'Purchase Request ID is required' };
    }

    const poNumber = await getNextDocNum(DocumentType.PURCHASE_ORDER, data.businessUnitId);
    
    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        purchaseRequestId: data.purchaseRequestId,
        businessUnitId: data.businessUnitId,
        bpCode: data.bpCode,
        ownerId: data.ownerId,
        postingDate: data.postingDate,
        deliveryDate: data.deliveryDate,
        documentDate: data.documentDate,
        remarks: data.remarks,
        totalAmount: data.totalAmount,
        status: DocumentStatus.OPEN,
        items: {
          create: data.items.map(item => ({
            description: item.description,
            inventoryItemId: item.inventoryItemId || undefined,
            glAccountId: item.glAccountId || undefined,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
            openQuantity: item.quantity,
          })),
        },
      },
      include: purchaseOrderInclude,
    });

    revalidatePath(`/${data.businessUnitId}/purchase-orders`);
    revalidatePath(`/${data.businessUnitId}/purchase-requests`);
    
    return {
      success: true,
      data: purchaseOrder as unknown as PurchaseOrderWithDetails,
      message: `Purchase Order ${poNumber} created successfully`,
    };
  } catch (error) {
    console.error('Error creating purchase order:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function getPurchaseOrders(
  filters: PurchaseOrderFilters = {},
  pagination: PaginationParams = { page: 1, limit: 10 }
): Promise<PaginatedResponse<PurchaseOrderWithDetails>> {
  try {
    const where: Prisma.PurchaseOrderWhereInput = {};
    
    if (filters.status) where.status = filters.status;
    if (filters.businessUnitId) where.businessUnitId = filters.businessUnitId;
    if (filters.bpCode) where.bpCode = filters.bpCode;
    
    if (filters.searchTerm) {
      where.OR = [
        { poNumber: { contains: filters.searchTerm, mode: 'insensitive' } },
        { purchaseRequest: { prNumber: { contains: filters.searchTerm, mode: 'insensitive' } } },
        { businessPartner: { name: { contains: filters.searchTerm, mode: 'insensitive' } } }
      ];
    }

    const [total, data] = await prisma.$transaction([
      prisma.purchaseOrder.count({ where }),
      prisma.purchaseOrder.findMany({
        where,
        include: purchaseOrderInclude,
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: data as unknown as PurchaseOrderWithDetails[],
      pagination: { ...pagination, total, totalPages: Math.ceil(total / pagination.limit) },
    };
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return { data: [], pagination: { ...pagination, total: 0, totalPages: 0 } };
  }
}

export async function getPurchaseOrderById(id: string): Promise<PurchaseOrderWithDetails | null> {
  try {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: purchaseOrderInclude,
    });
    return po as unknown as PurchaseOrderWithDetails | null;
  } catch (error) {
    console.error("Error fetching PO by ID:", error);
    return null;
  }
}

export async function updatePurchaseOrder(data: PurchaseOrderWithDetails): Promise<ApiResponse<PurchaseOrderWithDetails>> {
  try {
    const updatedOrder = await prisma.purchaseOrder.update({
      where: { id: data.id },
      data: {
        bpCode: data.businessPartner.bpCode,
        ownerId: data.owner.id,
        postingDate: data.postingDate,
        deliveryDate: data.deliveryDate,
        documentDate: data.documentDate,
        remarks: data.remarks,
      },
      include: purchaseOrderInclude
    });
    
    revalidatePath(`/${data.businessUnit.id}/purchase-orders/${data.id}`);
    revalidatePath(`/${data.businessUnit.id}/purchase-orders`);
    
    return {
      success: true,
      data: updatedOrder as unknown as PurchaseOrderWithDetails,
      message: "Purchase Order updated successfully."
    };
  } catch (error) {
    console.error("Error updating PO:", error);
    return { success: false, error: "Failed to update purchase order." };
  }
}

// --- HELPER/UTILITY FUNCTIONS ---
export async function getBusinessUnits(): Promise<BusinessUnitOption[]> {
  try {
    return await prisma.businessUnit.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    console.error('Error fetching business units:', error);
    return [];
  }
}

export async function getUoMs(): Promise<UoMOption[]> {
  try {
    return await prisma.uoM.findMany({
      select: { id: true, name: true, symbol: true },
      orderBy: { name: 'asc' }
    });
  } catch (error) {
    console.error("Error fetching UoMs:", error);
    return [];
  }
}

export async function getVendors(businessUnitId: string): Promise<BusinessPartnerOption[]> {
  try {
    return await prisma.businessPartner.findMany({
      where: { businessUnitId, type: 'VENDOR' },
      select: { id: true, bpCode: true, name: true },
      orderBy: { name: 'asc' }
    });
  } catch (error) {
    console.error("Error fetching vendors:", error);
    return [];
  }
}

export async function getUsers(businessUnitId: string): Promise<UserOption[]> {
  try {
    const assignments = await prisma.userBusinessUnit.findMany({
      where: { businessUnitId },
      include: { user: { select: { id: true, name: true } } }
    });
    return assignments.map(a => a.user).filter(user => user.name);
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

export async function getInventoryItems(businessUnitId: string): Promise<InventoryItemOption[]> {
  try {
    return await prisma.inventoryItem.findMany({
      where: { businessUnitId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    return [];
  }
}

export async function getExpenseAccounts(businessUnitId: string): Promise<GlAccountOption[]> {
  try {
    const expenseAccountType = await prisma.accountType.findUnique({ where: { name: "EXPENSE" } });
    if (!expenseAccountType) return [];

    return await prisma.glAccount.findMany({
      where: { businessUnitId, accountTypeId: expenseAccountType.id },
      select: { id: true, name: true, accountCode: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    console.error('Error fetching expense accounts:', error);
    return [];
  }
}

export async function getPurchaseOrderIdsForNav(businessUnitId: string): Promise<string[]> {
  try {
    const orders = await prisma.purchaseOrder.findMany({
      where: { businessUnitId },
      orderBy: { createdAt: 'asc' },
      select: { id: true }
    });
    return orders.map(o => o.id);
  } catch (error) {
    console.error("Error fetching PO IDs for navigation:", error);
    return [];
  }
}

export async function createUom(data: { name: string; symbol: string }): Promise<ApiResponse<UoMOption>> {
  try {
    const newUom = await prisma.uoM.create({
      data: {
        name: data.name,
        symbol: data.symbol,
      },
      select: { id: true, name: true, symbol: true },
    });

    revalidatePath('/settings/uoms'); // Revalidate a hypothetical UoM list page if you have one
    revalidatePath('/purchase-requests/new'); // Revalidate the PR creation page to update UoM options

    return {
      success: true,
      data: newUom,
      message: `Unit of Measure "${newUom.name}" created successfully.`,
    };
  } catch (error) {
    console.error('Error creating UoM:', error);
    // Check for unique constraint violation
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { success: false, error: 'A Unit of Measure with this name or symbol already exists.' };
    }
    return { success: false, error: (error as Error).message || 'Failed to create Unit of Measure.' };
  }
}