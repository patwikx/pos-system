import { PurchaseRequestStatus, DocumentStatus, BusinessPartnerType } from '@prisma/client';

// --- CORE & UTILITY TYPES ---

export type UoMOption = {
  id: string;
  name: string;
  symbol: string;
};

export type BusinessUnitOption = {
  id: string;
  name: string;
};

export type GlAccountOption = {
  id: string;
  name: string;
  accountCode: string;
};

export type UserOption = {
    id: string;
    name: string | null;
};

export type BusinessPartnerOption = {
    id: string;
    bpCode: string;
    name: string;
};

export type InventoryItemOption = {
    id: string;
    name: string;
};


// --- DOCUMENT DETAIL TYPES (Reflecting Prisma Includes) ---

export type PurchaseRequestItemWithDetails = {
  id: string;
  description: string;
  requestedQuantity: number;
  notes: string | null;
  uom: UoMOption | null;
};

export type PurchaseRequestWithDetails = {
  id: string;
  prNumber: string;
  businessUnitId: string;
  businessUnit: { id: string; name: string; };
  requestor: { id: string; name: string | null; };
  status: PurchaseRequestStatus;
  notes: string | null;
  approver: { id: string; name: string | null; } | null;
  approvalDate: Date | null;
  items: PurchaseRequestItemWithDetails[];
  purchaseOrder: { id: string; poNumber: string; } | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PurchaseOrderItemWithDetails = {
  id: string;
  description: string;
  inventoryItem: { id: string; name: string; } | null;
  glAccount: { id: string; name: string; accountCode: string; } | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  openQuantity: number;
};

export type ReceivingWithDetails = {
    id: string;
    docNum: string;
    receivedBy: { id: string; name: string | null };
};

export type PurchaseOrderWithDetails = {
  id: string;
  poNumber: string;
  purchaseRequest: { id: string; prNumber: string; };
  businessUnit: { id: string; name: string; };
  businessPartner: { bpCode: string; name: string; };
  owner: { id: string; name: string | null; };
  postingDate: Date;
  deliveryDate: Date;
  documentDate: Date;
  remarks: string | null;
  totalAmount: number;
  status: DocumentStatus;
  items: PurchaseOrderItemWithDetails[];
  receivings: ReceivingWithDetails[];
  createdAt: Date;
};


// --- FORM DATA & ACTION PAYLOAD TYPES ---

export type CreatePurchaseRequestItemData = {
  description: string; 
  requestedQuantity: number;
  uomId?: string;
  notes?: string;
};

export type CreatePurchaseRequestData = {
  businessUnitId: string;
  notes?: string;
  items: CreatePurchaseRequestItemData[];
};

export type ApprovePurchaseRequestData = {
  id: string;
  approved: boolean;
};

export type CreatePurchaseOrderItemData = {
  description: string;
  inventoryItemId?: string;
  glAccountId?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type CreatePurchaseOrderData = {
  purchaseRequestId?: string;
  businessUnitId: string;
  bpCode: string;
  ownerId: string;
  postingDate: Date;
  deliveryDate: Date;
  documentDate: Date;
  remarks?: string;
  totalAmount: number;
  items: CreatePurchaseOrderItemData[];
};

export type CreateReceivingItemData = {
    purchaseOrderItemId: string;
    quantityReceived: number;
    expiryDate?: Date;
};

export type CreateReceivingData = {
    purchaseOrderId: string;
    businessUnitId: string;
    receivedById: string;
    notes?: string;
};


// --- FILTER & PAGINATION TYPES ---

export type PaginationParams = {
  page: number;
  limit: number;
};

export type PurchaseRequestFilters = {
  status?: PurchaseRequestStatus;
  businessUnitId?: string;
  requestorId?: string;
  searchTerm?: string;
};

export type PurchaseOrderFilters = {
  status?: DocumentStatus;
  businessUnitId?: string;
  bpCode?: string;
  searchTerm?: string;
};


// --- GENERIC API RESPONSE TYPES ---

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
