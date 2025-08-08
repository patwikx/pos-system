"use server";

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import prismadb from '@/lib/db';
import { DocumentType, DocumentStatus, BusinessPartnerType, PeriodStatus } from '@prisma/client';
import {
  FinancialApiResponse,
  PaginatedFinancialResponse,
  FinancialDashboardData,
  TrialBalanceItem,
  BalanceSheetData,
  IncomeStatementData,
  CashFlowData,
  CreateARInvoiceData,
  CreateAPInvoiceData,
  CreateIncomingPaymentData,
  CreateOutgoingPaymentData,
  CreateDepositData,
  CreateBankAccountData,
  CreateAccountingPeriodData,
  ARInvoiceWithDetails,
  APInvoiceWithDetails,
  IncomingPaymentWithDetails,
  OutgoingPaymentWithDetails,
  DepositWithDetails,
  BankAccountWithDetails,
  AccountingPeriodWithDetails,
  FinancialFilters,
  ARInvoiceFilters,
  APInvoiceFilters,
  BankAccountFilters,
  AccountingPeriodFilters,
  AgingAnalysis,
  FinancialRatios,
  CashFlowStatement
} from '@/types/financials-types';

// --- AUTHENTICATION HELPER ---
async function getAuthenticatedUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthenticated');
  }
  return session.user;
}

// --- DOCUMENT NUMBERING HELPER ---
async function getNextDocumentNumber(docType: DocumentType, businessUnitId: string): Promise<string> {
  const series = await prismadb.numberingSeries.findUnique({
    where: {
      documentType_businessUnitId: {
        documentType: docType,
        businessUnitId
      }
    }
  });

  if (!series) {
    throw new Error(`Numbering series for ${docType} not found`);
  }

  const docNum = `${series.prefix}${series.nextNumber}`;
  
  await prismadb.numberingSeries.update({
    where: { id: series.id },
    data: { nextNumber: { increment: 1 } }
  });

  return docNum;
}

// --- FINANCIAL DASHBOARD ---

export async function getFinancialDashboard(businessUnitId: string): Promise<FinancialDashboardData> {
  try {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31);

    // Get all accounts for this business unit
    const accounts = await prismadb.glAccount.findMany({
      where: { businessUnitId },
      include: { accountType: true }
    });

    // Calculate totals by account type
    const assetAccounts = accounts.filter(acc => acc.accountType.name === 'ASSET');
    const liabilityAccounts = accounts.filter(acc => acc.accountType.name === 'LIABILITY');
    const equityAccounts = accounts.filter(acc => acc.accountType.name === 'EQUITY');
    const revenueAccounts = accounts.filter(acc => acc.accountType.name === 'REVENUE');
    const expenseAccounts = accounts.filter(acc => acc.accountType.name === 'EXPENSE');

    const totalAssets = assetAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const totalLiabilities = liabilityAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const totalEquity = equityAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const totalRevenue = revenueAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const totalExpenses = expenseAccounts.reduce((sum, acc) => sum + acc.balance, 0);

    const netIncome = totalRevenue - totalExpenses;

    // Get cash accounts for cash flow
    const cashAccounts = assetAccounts.filter(acc => 
      acc.name.toLowerCase().includes('cash') || 
      acc.accountCode.startsWith('1000')
    );
    const cashFlow = cashAccounts.reduce((sum, acc) => sum + acc.balance, 0);

    // Get A/R and A/P totals
    const arInvoices = await prismadb.aRInvoice.findMany({
      where: { 
        businessUnitId,
        status: DocumentStatus.OPEN
      }
    });

    const apInvoices = await prismadb.aPInvoice.findMany({
      where: { 
        businessUnitId,
        status: DocumentStatus.OPEN
      }
    });

    const accountsReceivable = arInvoices.reduce((sum, inv) => sum + (inv.totalAmount - inv.amountPaid), 0);
    const accountsPayable = apInvoices.reduce((sum, inv) => sum + (inv.totalAmount - inv.amountPaid), 0);

    // Monthly revenue and expenses (simplified for now)
    const monthlyRevenue = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(currentYear, i, 1).toLocaleDateString('en-US', { month: 'short' }),
      amount: totalRevenue / 12
    }));

    const monthlyExpenses = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(currentYear, i, 1).toLocaleDateString('en-US', { month: 'short' }),
      amount: totalExpenses / 12
    }));

    // Top customers and vendors
    const customers = await prismadb.businessPartner.findMany({
      where: { 
        businessUnitId,
        type: BusinessPartnerType.CUSTOMER
      },
      take: 5
    });

    const vendors = await prismadb.businessPartner.findMany({
      where: { 
        businessUnitId,
        type: BusinessPartnerType.VENDOR
      },
      take: 5
    });

    const topCustomers = customers.map(customer => ({
      name: customer.name,
      amount: Math.random() * 10000 // TODO: Calculate actual amounts from invoices
    }));

    const topVendors = vendors.map(vendor => ({
      name: vendor.name,
      amount: Math.random() * 8000 // TODO: Calculate actual amounts from invoices
    }));

    // Aging analysis
    const agingReceivables = [
      { period: '0-30 days', amount: accountsReceivable * 0.6 },
      { period: '31-60 days', amount: accountsReceivable * 0.25 },
      { period: '61-90 days', amount: accountsReceivable * 0.1 },
      { period: '90+ days', amount: accountsReceivable * 0.05 }
    ];

    const agingPayables = [
      { period: '0-30 days', amount: accountsPayable * 0.7 },
      { period: '31-60 days', amount: accountsPayable * 0.2 },
      { period: '61-90 days', amount: accountsPayable * 0.08 },
      { period: '90+ days', amount: accountsPayable * 0.02 }
    ];

    // Cash flow trend
    const cashFlowTrend = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(currentYear, i, 1).toLocaleDateString('en-US', { month: 'short' }),
      inflow: Math.random() * 50000,
      outflow: Math.random() * 40000,
      net: Math.random() * 10000
    }));

    // Profit margin trend
    const profitMarginTrend = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(currentYear, i, 1).toLocaleDateString('en-US', { month: 'short' }),
      margin: Math.random() * 30 + 10 // 10-40% margin
    }));

    return {
      totalRevenue,
      totalExpenses,
      netIncome,
      totalAssets,
      totalLiabilities,
      totalEquity,
      cashFlow,
      accountsReceivable,
      accountsPayable,
      monthlyRevenue,
      monthlyExpenses,
      topCustomers,
      topVendors,
      agingReceivables,
      agingPayables,
      cashFlowTrend,
      profitMarginTrend
    };
  } catch (error) {
    console.error('Error fetching financial dashboard:', error);
    throw new Error('Failed to fetch financial dashboard data');
  }
}

// --- ACCOUNTS RECEIVABLE (A/R) ACTIONS ---

export async function createARInvoice(data: CreateARInvoiceData): Promise<FinancialApiResponse<ARInvoiceWithDetails>> {
  try {
    const user = await getAuthenticatedUser();
    const docNum = await getNextDocumentNumber(DocumentType.AR_INVOICE, data.businessUnitId);

    const totalAmount = data.items.reduce((sum, item) => sum + item.lineTotal, 0);

    const arInvoice = await prismadb.$transaction(async (tx) => {
      const invoice = await tx.aRInvoice.create({
        data: {
          docNum,
          businessUnitId: data.businessUnitId,
          bpCode: data.bpCode,
          baseDeliveryId: data.baseDeliveryId,
          postingDate: data.postingDate,
          dueDate: data.dueDate,
          documentDate: data.documentDate,
          remarks: data.remarks,
          totalAmount,
          items: {
            create: data.items
          }
        },
        include: {
          businessPartner: { select: { bpCode: true, name: true } },
          businessUnit: { select: { id: true, name: true } },
          items: {
            include: {
              menuItem: { select: { id: true, name: true } },
              glAccount: { select: { id: true, accountCode: true, name: true } }
            }
          },
          journalEntry: true
        }
      });

      // Create automatic journal entry
      const revenueAccount = await tx.glAccount.findFirst({
        where: { 
          businessUnitId: data.businessUnitId,
          accountType: { name: 'REVENUE' }
        }
      });

      const arAccount = await tx.glAccount.findFirst({
        where: { 
          businessUnitId: data.businessUnitId,
          accountType: { name: 'ASSET' },
          name: { contains: 'Receivable' }
        }
      });

      if (revenueAccount && arAccount) {
        const jeDocNum = await getNextDocumentNumber(DocumentType.JOURNAL_ENTRY, data.businessUnitId);
        
        await tx.journalEntry.create({
          data: {
            docNum: jeDocNum,
            postingDate: data.postingDate,
            remarks: `A/R Invoice ${docNum}`,
            authorId: user.id,
            businessUnitId: data.businessUnitId,
            lines: {
              create: [
                {
                  glAccountCode: arAccount.accountCode,
                  debit: totalAmount
                },
                {
                  glAccountCode: revenueAccount.accountCode,
                  credit: totalAmount
                }
              ]
            }
          }
        });

        // Update account balances
        await tx.glAccount.update({
          where: { id: arAccount.id },
          data: { balance: { increment: totalAmount } }
        });

        await tx.glAccount.update({
          where: { id: revenueAccount.id },
          data: { balance: { increment: totalAmount } }
        });
      }

      return invoice;
    });

    revalidatePath(`/${data.businessUnitId}/ar-invoice`);
    
    return {
      success: true,
      data: arInvoice,
      message: `A/R Invoice ${docNum} created successfully`
    };
  } catch (error) {
    console.error('Error creating A/R invoice:', error);
    return { success: false, error: 'Failed to create A/R invoice' };
  }
}

export async function getARInvoices(
  filters: ARInvoiceFilters,
  pagination: { page: number; limit: number } = { page: 1, limit: 20 }
): Promise<PaginatedFinancialResponse<ARInvoiceWithDetails>> {
  try {
    const where: any = {
      businessUnitId: filters.businessUnitId,
    };

    if (filters.status) where.status = filters.status;
    if (filters.bpCode) where.bpCode = filters.bpCode;
    if (filters.dateFrom || filters.dateTo) {
      where.postingDate = {};
      if (filters.dateFrom) where.postingDate.gte = filters.dateFrom;
      if (filters.dateTo) where.postingDate.lte = filters.dateTo;
    }

    if (filters.isPaid !== undefined) {
      if (filters.isPaid) {
        where.amountPaid = { gte: prismadb.aRInvoice.fields.totalAmount };
      } else {
        where.amountPaid = { lt: prismadb.aRInvoice.fields.totalAmount };
      }
    }

    if (filters.overdue) {
      where.dueDate = { lt: new Date() };
      where.amountPaid = { lt: prismadb.aRInvoice.fields.totalAmount };
    }

    if (filters.searchTerm) {
      where.OR = [
        { docNum: { contains: filters.searchTerm, mode: 'insensitive' } },
        { businessPartner: { name: { contains: filters.searchTerm, mode: 'insensitive' } } },
        { remarks: { contains: filters.searchTerm, mode: 'insensitive' } }
      ];
    }

    const [total, data] = await prismadb.$transaction([
      prismadb.aRInvoice.count({ where }),
      prismadb.aRInvoice.findMany({
        where,
        include: {
          businessPartner: { select: { bpCode: true, name: true } },
          businessUnit: { select: { id: true, name: true } },
          items: {
            include: {
              menuItem: { select: { id: true, name: true } },
              glAccount: { select: { id: true, accountCode: true, name: true } }
            }
          },
          journalEntry: true
        },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return {
      data,
      pagination: {
        ...pagination,
        total,
        totalPages: Math.ceil(total / pagination.limit)
      }
    };
  } catch (error) {
    console.error('Error fetching A/R invoices:', error);
    return {
      data: [],
      pagination: { ...pagination, total: 0, totalPages: 0 }
    };
  }
}

// --- ACCOUNTS PAYABLE (A/P) ACTIONS ---

export async function createAPInvoice(data: CreateAPInvoiceData): Promise<FinancialApiResponse<APInvoiceWithDetails>> {
  try {
    const user = await getAuthenticatedUser();
    const docNum = await getNextDocumentNumber(DocumentType.AP_INVOICE, data.businessUnitId);

    const totalAmount = data.items.reduce((sum, item) => sum + item.lineTotal, 0);

    const apInvoice = await prismadb.$transaction(async (tx) => {
      const invoice = await tx.aPInvoice.create({
        data: {
          docNum,
          businessUnitId: data.businessUnitId,
          bpCode: data.bpCode,
          basePurchaseOrderId: data.basePurchaseOrderId,
          postingDate: data.postingDate,
          dueDate: data.dueDate,
          documentDate: data.documentDate,
          remarks: data.remarks,
          totalAmount,
          items: {
            create: data.items
          }
        },
        include: {
          businessPartner: { select: { bpCode: true, name: true } },
          businessUnit: { select: { id: true, name: true } },
          items: {
            include: {
              glAccount: { select: { id: true, accountCode: true, name: true } }
            }
          },
          journalEntry: true,
          basePurchaseOrder: { select: { id: true, poNumber: true } }
        }
      });

      // Create automatic journal entry
      const apAccount = await tx.glAccount.findFirst({
        where: { 
          businessUnitId: data.businessUnitId,
          accountType: { name: 'LIABILITY' },
          name: { contains: 'Payable' }
        }
      });

      if (apAccount) {
        const jeDocNum = await getNextDocumentNumber(DocumentType.JOURNAL_ENTRY, data.businessUnitId);
        
        await tx.journalEntry.create({
          data: {
            docNum: jeDocNum,
            postingDate: data.postingDate,
            remarks: `A/P Invoice ${docNum}`,
            authorId: user.id,
            businessUnitId: data.businessUnitId,
            lines: {
              create: [
                ...data.items.map(item => ({
                  glAccountCode: item.glAccountId,
                  debit: item.lineTotal
                })),
                {
                  glAccountCode: apAccount.accountCode,
                  credit: totalAmount
                }
              ]
            }
          }
        });

        // Update account balances
        for (const item of data.items) {
          const account = await tx.glAccount.findUnique({ where: { id: item.glAccountId } });
          if (account) {
            await tx.glAccount.update({
              where: { id: item.glAccountId },
              data: { balance: { increment: item.lineTotal } }
            });
          }
        }

        await tx.glAccount.update({
          where: { id: apAccount.id },
          data: { balance: { increment: totalAmount } }
        });
      }

      return invoice;
    });

    revalidatePath(`/${data.businessUnitId}/ap-invoice`);
    
    return {
      success: true,
      data: apInvoice,
      message: `A/P Invoice ${docNum} created successfully`
    };
  } catch (error) {
    console.error('Error creating A/P invoice:', error);
    return { success: false, error: 'Failed to create A/P invoice' };
  }
}

export async function getAPInvoices(
  filters: APInvoiceFilters,
  pagination: { page: number; limit: number } = { page: 1, limit: 20 }
): Promise<PaginatedFinancialResponse<APInvoiceWithDetails>> {
  try {
    const where: any = {
      businessUnitId: filters.businessUnitId,
    };

    if (filters.status) where.status = filters.status;
    if (filters.bpCode) where.bpCode = filters.bpCode;
    if (filters.dateFrom || filters.dateTo) {
      where.postingDate = {};
      if (filters.dateFrom) where.postingDate.gte = filters.dateFrom;
      if (filters.dateTo) where.postingDate.lte = filters.dateTo;
    }

    if (filters.isPaid !== undefined) {
      if (filters.isPaid) {
        where.amountPaid = { gte: prismadb.aPInvoice.fields.totalAmount };
      } else {
        where.amountPaid = { lt: prismadb.aPInvoice.fields.totalAmount };
      }
    }

    if (filters.overdue) {
      where.dueDate = { lt: new Date() };
      where.amountPaid = { lt: prismadb.aPInvoice.fields.totalAmount };
    }

    if (filters.searchTerm) {
      where.OR = [
        { docNum: { contains: filters.searchTerm, mode: 'insensitive' } },
        { businessPartner: { name: { contains: filters.searchTerm, mode: 'insensitive' } } },
        { remarks: { contains: filters.searchTerm, mode: 'insensitive' } }
      ];
    }

    const [total, data] = await prismadb.$transaction([
      prismadb.aPInvoice.count({ where }),
      prismadb.aPInvoice.findMany({
        where,
        include: {
          businessPartner: { select: { bpCode: true, name: true } },
          businessUnit: { select: { id: true, name: true } },
          items: {
            include: {
              glAccount: { select: { id: true, accountCode: true, name: true } }
            }
          },
          journalEntry: true,
          basePurchaseOrder: { select: { id: true, poNumber: true } }
        },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return {
      data,
      pagination: {
        ...pagination,
        total,
        totalPages: Math.ceil(total / pagination.limit)
      }
    };
  } catch (error) {
    console.error('Error fetching A/P invoices:', error);
    return {
      data: [],
      pagination: { ...pagination, total: 0, totalPages: 0 }
    };
  }
}

// --- BANKING ACTIONS ---

export async function createBankAccount(data: CreateBankAccountData): Promise<FinancialApiResponse<BankAccountWithDetails>> {
  try {
    const user = await getAuthenticatedUser();

    const bankAccount = await prismadb.bankAccount.create({
      data: {
        name: data.name,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        glAccountId: data.glAccountId,
        businessUnitId: data.businessUnitId
      },
      include: {
        glAccount: true,
        businessUnit: { select: { id: true, name: true } },
        _count: {
          select: {
            incomingPayments: true,
            outgoingPayments: true,
            deposits: true
          }
        }
      }
    });

    revalidatePath(`/${data.businessUnitId}/bank-accounts`);
    
    return {
      success: true,
      data: bankAccount,
      message: `Bank account ${data.name} created successfully`
    };
  } catch (error) {
    console.error('Error creating bank account:', error);
    return { success: false, error: 'Failed to create bank account' };
  }
}

export async function createIncomingPayment(data: CreateIncomingPaymentData): Promise<FinancialApiResponse<IncomingPaymentWithDetails>> {
  try {
    const user = await getAuthenticatedUser();
    const docNum = await getNextDocumentNumber(DocumentType.INCOMING_PAYMENT, data.businessUnitId);

    const payment = await prismadb.$transaction(async (tx) => {
      const incomingPayment = await tx.incomingPayment.create({
        data: {
          docNum,
          businessUnitId: data.businessUnitId,
          bpCode: data.bpCode,
          paymentDate: data.paymentDate,
          amount: data.amount,
          bankAccountId: data.bankAccountId
        },
        include: {
          businessPartner: { select: { bpCode: true, name: true } },
          bankAccount: { select: { id: true, name: true } },
          journalEntry: true
        }
      });

      // Create journal entry
      const bankAccount = await tx.bankAccount.findUnique({
        where: { id: data.bankAccountId },
        include: { glAccount: true }
      });

      const arAccount = await tx.glAccount.findFirst({
        where: { 
          businessUnitId: data.businessUnitId,
          accountType: { name: 'ASSET' },
          name: { contains: 'Receivable' }
        }
      });

      if (bankAccount && arAccount) {
        const jeDocNum = await getNextDocumentNumber(DocumentType.JOURNAL_ENTRY, data.businessUnitId);
        
        await tx.journalEntry.create({
          data: {
            docNum: jeDocNum,
            postingDate: data.paymentDate,
            remarks: `Incoming Payment ${docNum}`,
            authorId: user.id,
            businessUnitId: data.businessUnitId,
            lines: {
              create: [
                {
                  glAccountCode: bankAccount.glAccount.accountCode,
                  debit: data.amount
                },
                {
                  glAccountCode: arAccount.accountCode,
                  credit: data.amount
                }
              ]
            }
          }
        });

        // Update balances
        await tx.glAccount.update({
          where: { id: bankAccount.glAccountId },
          data: { balance: { increment: data.amount } }
        });

        await tx.glAccount.update({
          where: { id: arAccount.id },
          data: { balance: { decrement: data.amount } }
        });
      }

      return incomingPayment;
    });

    revalidatePath(`/${data.businessUnitId}/incoming-payments`);
    
    return {
      success: true,
      data: payment,
      message: `Incoming payment ${docNum} recorded successfully`
    };
  } catch (error) {
    console.error('Error creating incoming payment:', error);
    return { success: false, error: 'Failed to record incoming payment' };
  }
}

export async function createOutgoingPayment(data: CreateOutgoingPaymentData): Promise<FinancialApiResponse<OutgoingPaymentWithDetails>> {
  try {
    const user = await getAuthenticatedUser();
    const docNum = await getNextDocumentNumber(DocumentType.OUTGOING_PAYMENT, data.businessUnitId);

    const payment = await prismadb.$transaction(async (tx) => {
      const outgoingPayment = await tx.outgoingPayment.create({
        data: {
          docNum,
          businessUnitId: data.businessUnitId,
          bpCode: data.bpCode,
          paymentDate: data.paymentDate,
          amount: data.amount,
          bankAccountId: data.bankAccountId
        },
        include: {
          businessPartner: { select: { bpCode: true, name: true } },
          bankAccount: { select: { id: true, name: true } },
          journalEntry: true
        }
      });

      // Create journal entry
      const bankAccount = await tx.bankAccount.findUnique({
        where: { id: data.bankAccountId },
        include: { glAccount: true }
      });

      const apAccount = await tx.glAccount.findFirst({
        where: { 
          businessUnitId: data.businessUnitId,
          accountType: { name: 'LIABILITY' },
          name: { contains: 'Payable' }
        }
      });

      if (bankAccount && apAccount) {
        const jeDocNum = await getNextDocumentNumber(DocumentType.JOURNAL_ENTRY, data.businessUnitId);
        
        await tx.journalEntry.create({
          data: {
            docNum: jeDocNum,
            postingDate: data.paymentDate,
            remarks: `Outgoing Payment ${docNum}`,
            authorId: user.id,
            businessUnitId: data.businessUnitId,
            lines: {
              create: [
                {
                  glAccountCode: apAccount.accountCode,
                  debit: data.amount
                },
                {
                  glAccountCode: bankAccount.glAccount.accountCode,
                  credit: data.amount
                }
              ]
            }
          }
        });

        // Update balances
        await tx.glAccount.update({
          where: { id: apAccount.id },
          data: { balance: { decrement: data.amount } }
        });

        await tx.glAccount.update({
          where: { id: bankAccount.glAccountId },
          data: { balance: { decrement: data.amount } }
        });
      }

      return outgoingPayment;
    });

    revalidatePath(`/${data.businessUnitId}/outgoing-payments`);
    
    return {
      success: true,
      data: payment,
      message: `Outgoing payment ${docNum} recorded successfully`
    };
  } catch (error) {
    console.error('Error creating outgoing payment:', error);
    return { success: false, error: 'Failed to record outgoing payment' };
  }
}

// --- ACCOUNTING PERIODS ---

export async function createAccountingPeriod(data: CreateAccountingPeriodData): Promise<FinancialApiResponse<AccountingPeriodWithDetails>> {
  try {
    const user = await getAuthenticatedUser();

    // Validate period dates
    if (data.startDate >= data.endDate) {
      return { success: false, error: 'Start date must be before end date' };
    }

    // Check for overlapping periods
    const overlappingPeriod = await prismadb.accountingPeriod.findFirst({
      where: {
        businessUnitId: data.businessUnitId,
        OR: [
          {
            AND: [
              { startDate: { lte: data.startDate } },
              { endDate: { gte: data.startDate } }
            ]
          },
          {
            AND: [
              { startDate: { lte: data.endDate } },
              { endDate: { gte: data.endDate } }
            ]
          }
        ]
      }
    });

    if (overlappingPeriod) {
      return { success: false, error: 'Period overlaps with existing accounting period' };
    }

    const accountingPeriod = await prismadb.accountingPeriod.create({
      data: {
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        status: data.status,
        businessUnitId: data.businessUnitId
      },
      include: {
        businessUnit: { select: { id: true, name: true } },
        _count: {
          select: { journalEntries: true }
        }
      }
    });

    revalidatePath(`/${data.businessUnitId}/accounting-periods`);
    
    return {
      success: true,
      data: accountingPeriod,
      message: `Accounting period ${data.name} created successfully`
    };
  } catch (error) {
    console.error('Error creating accounting period:', error);
    return { success: false, error: 'Failed to create accounting period' };
  }
}

export async function closeAccountingPeriod(periodId: string): Promise<FinancialApiResponse<AccountingPeriodWithDetails>> {
  try {
    const user = await getAuthenticatedUser();

    const period = await prismadb.accountingPeriod.findUnique({
      where: { id: periodId },
      include: {
        businessUnit: { select: { id: true, name: true } },
        _count: { select: { journalEntries: true } }
      }
    });

    if (!period) {
      return { success: false, error: 'Accounting period not found' };
    }

    if (period.status === PeriodStatus.CLOSED) {
      return { success: false, error: 'Period is already closed' };
    }

    // Validate all journal entries in the period are balanced
    const unbalancedEntries = await prismadb.journalEntry.findMany({
      where: {
        businessUnitId: period.businessUnitId,
        postingDate: {
          gte: period.startDate,
          lte: period.endDate
        }
      },
      include: { lines: true }
    });

    for (const entry of unbalancedEntries) {
      const totalDebits = entry.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
      const totalCredits = entry.lines.reduce((sum, line) => sum + (line.credit || 0), 0);
      
      if (Math.abs(totalDebits - totalCredits) >= 0.01) {
        return { 
          success: false, 
          error: `Journal entry ${entry.docNum} is not balanced. Cannot close period.` 
        };
      }
    }

    const closedPeriod = await prismadb.accountingPeriod.update({
      where: { id: periodId },
      data: { status: PeriodStatus.CLOSED },
      include: {
        businessUnit: { select: { id: true, name: true } },
        _count: { select: { journalEntries: true } }
      }
    });

    revalidatePath(`/${period.businessUnitId}/accounting-periods`);
    
    return {
      success: true,
      data: closedPeriod,
      message: `Accounting period ${period.name} closed successfully`
    };
  } catch (error) {
    console.error('Error closing accounting period:', error);
    return { success: false, error: 'Failed to close accounting period' };
  }
}

// --- FINANCIAL REPORTS ---

export async function generateTrialBalance(businessUnitId: string, asOfDate?: Date): Promise<TrialBalanceItem[]> {
  try {
    const accounts = await prismadb.glAccount.findMany({
      where: { businessUnitId },
      include: { accountType: true },
      orderBy: { accountCode: 'asc' }
    });

    return accounts.map(account => ({
      accountCode: account.accountCode,
      accountName: account.name,
      accountType: account.accountType.name,
      debitBalance: account.balance > 0 && ['ASSET', 'EXPENSE'].includes(account.accountType.name) ? account.balance : 0,
      creditBalance: account.balance > 0 && ['LIABILITY', 'EQUITY', 'REVENUE'].includes(account.accountType.name) ? account.balance : 0,
    }));
  } catch (error) {
    console.error('Error generating trial balance:', error);
    return [];
  }
}

export async function generateBalanceSheet(businessUnitId: string, asOfDate?: Date): Promise<BalanceSheetData> {
  try {
    const accounts = await prismadb.glAccount.findMany({
      where: { businessUnitId },
      include: { accountType: true },
      orderBy: { accountCode: 'asc' }
    });

    const assets = accounts.filter(acc => acc.accountType.name === 'ASSET');
    const liabilities = accounts.filter(acc => acc.accountType.name === 'LIABILITY');
    const equity = accounts.filter(acc => acc.accountType.name === 'EQUITY');
    const revenue = accounts.filter(acc => acc.accountType.name === 'REVENUE');
    const expenses = accounts.filter(acc => acc.accountType.name === 'EXPENSE');

    const retainedEarnings = revenue.reduce((sum, acc) => sum + acc.balance, 0) - 
                            expenses.reduce((sum, acc) => sum + acc.balance, 0);

    return {
      assets: {
        current: assets.filter(acc => acc.accountCode.startsWith('1')).map(acc => ({
          accountCode: acc.accountCode,
          name: acc.name,
          amount: acc.balance
        })),
        nonCurrent: assets.filter(acc => !acc.accountCode.startsWith('1')).map(acc => ({
          accountCode: acc.accountCode,
          name: acc.name,
          amount: acc.balance
        })),
        totalAssets: assets.reduce((sum, acc) => sum + acc.balance, 0)
      },
      liabilities: {
        current: liabilities.filter(acc => acc.accountCode.startsWith('2')).map(acc => ({
          accountCode: acc.accountCode,
          name: acc.name,
          amount: acc.balance
        })),
        nonCurrent: liabilities.filter(acc => !acc.accountCode.startsWith('2')).map(acc => ({
          accountCode: acc.accountCode,
          name: acc.name,
          amount: acc.balance
        })),
        totalLiabilities: liabilities.reduce((sum, acc) => sum + acc.balance, 0)
      },
      equity: {
        accounts: equity.map(acc => ({
          accountCode: acc.accountCode,
          name: acc.name,
          amount: acc.balance
        })),
        retainedEarnings,
        totalEquity: equity.reduce((sum, acc) => sum + acc.balance, 0) + retainedEarnings
      }
    };
  } catch (error) {
    console.error('Error generating balance sheet:', error);
    throw new Error('Failed to generate balance sheet');
  }
}

export async function generateIncomeStatement(businessUnitId: string, startDate: Date, endDate: Date): Promise<IncomeStatementData> {
  try {
    const accounts = await prismadb.glAccount.findMany({
      where: { businessUnitId },
      include: { accountType: true },
      orderBy: { accountCode: 'asc' }
    });

    const revenue = accounts.filter(acc => acc.accountType.name === 'REVENUE');
    const expenses = accounts.filter(acc => acc.accountType.name === 'EXPENSE');

    const totalRevenue = revenue.reduce((sum, acc) => sum + acc.balance, 0);
    const totalExpenses = expenses.reduce((sum, acc) => sum + acc.balance, 0);

    return {
      revenue: revenue.map(acc => ({
        accountCode: acc.accountCode,
        name: acc.name,
        amount: acc.balance
      })),
      expenses: expenses.map(acc => ({
        accountCode: acc.accountCode,
        name: acc.name,
        amount: acc.balance
      })),
      totalRevenue,
      totalExpenses,
      grossProfit: totalRevenue - totalExpenses,
      netIncome: totalRevenue - totalExpenses
    };
  } catch (error) {
    console.error('Error generating income statement:', error);
    throw new Error('Failed to generate income statement');
  }
}

export async function generateAgingAnalysis(businessUnitId: string, type: 'receivables' | 'payables'): Promise<AgingAnalysis> {
  try {
    const today = new Date();
    const invoices = type === 'receivables' 
      ? await prismadb.aRInvoice.findMany({
          where: { businessUnitId, status: DocumentStatus.OPEN },
          include: { businessPartner: true }
        })
      : await prismadb.aPInvoice.findMany({
          where: { businessUnitId, status: DocumentStatus.OPEN },
          include: { businessPartner: true }
        });

    const buckets = [
      { period: '0-30 days', amount: 0, count: 0, percentage: 0 },
      { period: '31-60 days', amount: 0, count: 0, percentage: 0 },
      { period: '61-90 days', amount: 0, count: 0, percentage: 0 },
      { period: '90+ days', amount: 0, count: 0, percentage: 0 }
    ];

    let totalAmount = 0;
    let totalDaysOutstanding = 0;

    for (const invoice of invoices) {
      const balance = invoice.totalAmount - invoice.amountPaid;
      const daysOutstanding = Math.floor((today.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      totalAmount += balance;
      totalDaysOutstanding += daysOutstanding;

      if (daysOutstanding <= 30) {
        buckets[0].amount += balance;
        buckets[0].count++;
      } else if (daysOutstanding <= 60) {
        buckets[1].amount += balance;
        buckets[1].count++;
      } else if (daysOutstanding <= 90) {
        buckets[2].amount += balance;
        buckets[2].count++;
      } else {
        buckets[3].amount += balance;
        buckets[3].count++;
      }
    }

    // Calculate percentages
    buckets.forEach(bucket => {
      bucket.percentage = totalAmount > 0 ? (bucket.amount / totalAmount) * 100 : 0;
    });

    return {
      buckets,
      totalAmount,
      totalCount: invoices.length,
      averageDaysOutstanding: invoices.length > 0 ? totalDaysOutstanding / invoices.length : 0
    };
  } catch (error) {
    console.error('Error generating aging analysis:', error);
    throw new Error('Failed to generate aging analysis');
  }
}

export async function calculateFinancialRatios(businessUnitId: string): Promise<FinancialRatios> {
  try {
    const accounts = await prismadb.glAccount.findMany({
      where: { businessUnitId },
      include: { accountType: true }
    });

    const assets = accounts.filter(acc => acc.accountType.name === 'ASSET');
    const liabilities = accounts.filter(acc => acc.accountType.name === 'LIABILITY');
    const equity = accounts.filter(acc => acc.accountType.name === 'EQUITY');
    const revenue = accounts.filter(acc => acc.accountType.name === 'REVENUE');
    const expenses = accounts.filter(acc => acc.accountType.name === 'EXPENSE');

    const totalAssets = assets.reduce((sum, acc) => sum + acc.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, acc) => sum + acc.balance, 0);
    const totalEquity = equity.reduce((sum, acc) => sum + acc.balance, 0);
    const totalRevenue = revenue.reduce((sum, acc) => sum + acc.balance, 0);
    const totalExpenses = expenses.reduce((sum, acc) => sum + acc.balance, 0);
    const netIncome = totalRevenue - totalExpenses;

    const currentAssets = assets.filter(acc => acc.accountCode.startsWith('1')).reduce((sum, acc) => sum + acc.balance, 0);
    const currentLiabilities = liabilities.filter(acc => acc.accountCode.startsWith('2')).reduce((sum, acc) => sum + acc.balance, 0);
    const cashAssets = assets.filter(acc => acc.name.toLowerCase().includes('cash')).reduce((sum, acc) => sum + acc.balance, 0);

    return {
      liquidity: {
        currentRatio: currentLiabilities > 0 ? currentAssets / currentLiabilities : 0,
        quickRatio: currentLiabilities > 0 ? (currentAssets - 0) / currentLiabilities : 0, // Simplified
        cashRatio: currentLiabilities > 0 ? cashAssets / currentLiabilities : 0
      },
      profitability: {
        grossProfitMargin: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0,
        netProfitMargin: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0,
        returnOnAssets: totalAssets > 0 ? (netIncome / totalAssets) * 100 : 0,
        returnOnEquity: totalEquity > 0 ? (netIncome / totalEquity) * 100 : 0
      },
      efficiency: {
        assetTurnover: totalAssets > 0 ? totalRevenue / totalAssets : 0,
        receivablesTurnover: 0, // TODO: Calculate from A/R data
        payablesTurnover: 0, // TODO: Calculate from A/P data
        inventoryTurnover: 0 // TODO: Calculate from inventory data
      },
      leverage: {
        debtToEquity: totalEquity > 0 ? totalLiabilities / totalEquity : 0,
        debtToAssets: totalAssets > 0 ? totalLiabilities / totalAssets : 0,
        equityMultiplier: totalEquity > 0 ? totalAssets / totalEquity : 0
      }
    };
  } catch (error) {
    console.error('Error calculating financial ratios:', error);
    throw new Error('Failed to calculate financial ratios');
  }
}

// --- UTILITY FUNCTIONS ---

export async function getBusinessPartners(businessUnitId: string, type?: BusinessPartnerType) {
  try {
    const where: any = { businessUnitId };
    if (type) where.type = type;

    return await prismadb.businessPartner.findMany({
      where,
      select: { bpCode: true, name: true, type: true },
      orderBy: { name: 'asc' }
    });
  } catch (error) {
    console.error('Error fetching business partners:', error);
    return [];
  }
}

export async function getBankAccounts(businessUnitId: string) {
  try {
    return await prismadb.bankAccount.findMany({
      where: { businessUnitId },
      include: {
        glAccount: true,
        businessUnit: { select: { id: true, name: true } },
        _count: {
          select: {
            incomingPayments: true,
            outgoingPayments: true,
            deposits: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
  } catch (error) {
    console.error('Error fetching bank accounts:', error);
    return [];
  }
}

export async function getAccountsForDropdown(businessUnitId: string, accountType?: string) {
  try {
    const where: any = { businessUnitId };
    if (accountType) {
      where.accountType = { name: accountType };
    }

    return await prismadb.glAccount.findMany({
      where,
      select: {
        id: true,
        accountCode: true,
        name: true,
        accountType: { select: { name: true } }
      },
      orderBy: { accountCode: 'asc' }
    });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return [];
  }
}

export async function getAccountingPeriods(filters: AccountingPeriodFilters) {
  try {
    const where: any = { businessUnitId: filters.businessUnitId };
    
    if (filters.status) where.status = filters.status;
    if (filters.year) {
      const startOfYear = new Date(filters.year, 0, 1);
      const endOfYear = new Date(filters.year, 11, 31);
      where.startDate = { gte: startOfYear };
      where.endDate = { lte: endOfYear };
    }

    return await prismadb.accountingPeriod.findMany({
      where,
      include: {
        businessUnit: { select: { id: true, name: true } },
        _count: { select: { journalEntries: true } }
      },
      orderBy: { startDate: 'desc' }
    });
  } catch (error) {
    console.error('Error fetching accounting periods:', error);
    return [];
  }
}

export async function validateAccountingPeriod(periodId: string) {
  try {
    const period = await prismadb.accountingPeriod.findUnique({
      where: { id: periodId },
      include: {
        _count: { select: { journalEntries: true } }
      }
    });

    if (!period) {
      return { isValid: false, canClose: false, errors: ['Period not found'], warnings: [] };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for unbalanced journal entries
    const journalEntries = await prismadb.journalEntry.findMany({
      where: {
        businessUnitId: period.businessUnitId,
        postingDate: {
          gte: period.startDate,
          lte: period.endDate
        }
      },
      include: { lines: true }
    });

    for (const entry of journalEntries) {
      const totalDebits = entry.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
      const totalCredits = entry.lines.reduce((sum, line) => sum + (line.credit || 0), 0);
      
      if (Math.abs(totalDebits - totalCredits) >= 0.01) {
        errors.push(`Journal entry ${entry.docNum} is not balanced`);
      }
    }

    // Check for open documents in the period
    const openARInvoices = await prismadb.aRInvoice.count({
      where: {
        businessUnitId: period.businessUnitId,
        postingDate: { gte: period.startDate, lte: period.endDate },
        status: DocumentStatus.OPEN
      }
    });

    const openAPInvoices = await prismadb.aPInvoice.count({
      where: {
        businessUnitId: period.businessUnitId,
        postingDate: { gte: period.startDate, lte: period.endDate },
        status: DocumentStatus.OPEN
      }
    });

    if (openARInvoices > 0) {
      warnings.push(`${openARInvoices} open A/R invoices in this period`);
    }

    if (openAPInvoices > 0) {
      warnings.push(`${openAPInvoices} open A/P invoices in this period`);
    }

    return {
      isValid: errors.length === 0,
      canClose: errors.length === 0 && period.status === PeriodStatus.OPEN,
      errors,
      warnings
    };
  } catch (error) {
    console.error('Error validating accounting period:', error);
    return { isValid: false, canClose: false, errors: ['Validation failed'], warnings: [] };
  }
}