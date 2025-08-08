"use server";

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import prismadb from '@/lib/db';
import { Prisma, DocumentStatus, BusinessPartnerType, DocumentType, PeriodStatus } from '@prisma/client';
import {
  CreateGlAccountData,
  UpdateGlAccountData,
  CreateJournalEntryData,
  FinancialFilters,
  JournalEntryFilters,
  GlAccountWithDetails,
  JournalEntryWithDetails,
  TrialBalanceItem,
  FinancialReportData,
  FinancialApiResponse,
  PaginatedFinancialResponse,
  JournalEntryValidation,
  CreateARInvoiceData,
  ARInvoiceWithDetails,
  ARInvoiceFilters,
  CreateAPInvoiceData,
  APInvoiceWithDetails,
  APInvoiceFilters,
  CreateBankAccountData,
  BankAccountWithDetails,
  CreateIncomingPaymentData,
  IncomingPaymentWithDetails,
  CreateOutgoingPaymentData,
  OutgoingPaymentWithDetails,
  CreateAccountingPeriodData,
  AccountingPeriodWithDetails,
  AccountingPeriodValidation,
  FinancialDashboardData,
  FinancialRatios,
  BusinessPartnerOption,
  GlAccountOption,
  BankAccountOption
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

// --- GL ACCOUNT ACTIONS ---

export async function createGlAccount(data: CreateGlAccountData): Promise<FinancialApiResponse<GlAccountWithDetails>> {
  try {
    const user = await getAuthenticatedUser();
    
    const existingAccount = await prismadb.glAccount.findUnique({
      where: { accountCode: data.accountCode }
    });
    
    if (existingAccount) {
      return { success: false, error: 'Account code already exists' };
    }

    const glAccount = await prismadb.glAccount.create({
      data: {
        accountCode: data.accountCode,
        name: data.name,
        accountTypeId: data.accountTypeId,
        businessUnitId: data.businessUnitId,
        balance: data.balance || 0,
      },
      include: {
        accountType: true,
        businessUnit: { select: { id: true, name: true } },
        _count: {
          select: { journalLines: true }
        }
      }
    });

    revalidatePath(`/${data.businessUnitId}/chart-of-accounts`);
    
    return {
      success: true,
      data: glAccount,
      message: `Account ${data.accountCode} created successfully`
    };
  } catch (error) {
    console.error('Error creating GL account:', error);
    return { success: false, error: 'Failed to create GL account' };
  }
}

// --- BUSINESS PARTNERS ---

export async function getBusinessPartners(businessUnitId: string, type?: BusinessPartnerType): Promise<BusinessPartnerOption[]> {
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

export async function createBusinessPartner(data: {
  bpCode: string;
  name: string;
  type: BusinessPartnerType;
  phone?: string;
  email?: string;
  businessUnitId: string;
}): Promise<FinancialApiResponse<any>> {
  try {
    const user = await getAuthenticatedUser();
    
    const existingPartner = await prismadb.businessPartner.findUnique({
      where: { bpCode: data.bpCode }
    });
    
    if (existingPartner) {
      return { success: false, error: 'Business partner code already exists' };
    }

    const businessPartner = await prismadb.businessPartner.create({
      data: {
        bpCode: data.bpCode,
        name: data.name,
        type: data.type,
        phone: data.phone,
        email: data.email,
        businessUnitId: data.businessUnitId,
        loyaltyPoints: 0
      }
    });

    revalidatePath(`/${data.businessUnitId}/business-partners`);
    
    return {
      success: true,
      data: businessPartner,
      message: `Business partner ${data.name} created successfully`
    };
  } catch (error) {
    console.error('Error creating business partner:', error);
    return { success: false, error: 'Failed to create business partner' };
  }
}

// --- ACCOUNTS FOR DROPDOWN ---

export async function getAccountsForDropdown(businessUnitId: string, accountTypeName?: string): Promise<GlAccountOption[]> {
  try {
    const where: Prisma.GlAccountWhereInput = { businessUnitId };
    if (accountTypeName) {
      where.accountType = { name: accountTypeName };
    }

    const accounts = await prismadb.glAccount.findMany({
      where,
      select: {
        id: true,
        accountCode: true,
        name: true,
        accountType: { select: { name: true } }
      },
      orderBy: { accountCode: 'asc' }
    });

    return accounts.map(account => ({
      id: account.id,
      accountCode: account.accountCode,
      name: account.name,
      accountType: account.accountType.name
    }));
  } catch (error) {
    console.error('Error fetching accounts for dropdown:', error);
    return [];
  }
}

// --- BANK ACCOUNTS ---

export async function getBankAccounts(businessUnitId: string): Promise<BankAccountWithDetails[]> {
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

export async function createBankAccount(data: CreateBankAccountData): Promise<FinancialApiResponse<BankAccountWithDetails>> {
  try {
    const user = await getAuthenticatedUser();
    
    const existingAccount = await prismadb.bankAccount.findFirst({
      where: { accountNumber: data.accountNumber }
    });
    
    if (existingAccount) {
      return { success: false, error: 'Account number already exists' };
    }

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

// --- A/R INVOICES ---

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
        where.status = DocumentStatus.CLOSED;
      } else {
        where.status = DocumentStatus.OPEN;
      }
    }

    if (filters.overdue) {
      where.dueDate = { lt: new Date() };
      where.status = DocumentStatus.OPEN;
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
          journalEntry: true,
          baseDelivery: { select: { id: true, docNum: true } },
          orders: { select: { id: true, totalAmount: true } }
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
          journalEntry: true,
          baseDelivery: { select: { id: true, docNum: true } },
          orders: { select: { id: true, totalAmount: true } }
        }
      });

      // Create automatic journal entry
      const arAccount = await tx.glAccount.findFirst({
        where: { 
          businessUnitId: data.businessUnitId,
          accountType: { name: 'ASSET' },
          name: { contains: 'Receivable' }
        }
      });

      if (arAccount) {
        const jeDocNum = await getNextDocumentNumber(DocumentType.JOURNAL_ENTRY, data.businessUnitId);
        
        const journalEntry = await tx.journalEntry.create({
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
                ...data.items.map(item => ({
                  glAccountCode: item.glAccountId,
                  credit: item.lineTotal
                }))
              ]
            }
          }
        });

        await tx.aRInvoice.update({
          where: { id: invoice.id },
          data: { journalEntryId: journalEntry.id }
        });

        // Update account balances
        await tx.glAccount.update({
          where: { id: arAccount.id },
          data: { balance: { increment: totalAmount } }
        });

        for (const item of data.items) {
          const account = await tx.glAccount.findUnique({ where: { id: item.glAccountId } });
          if (account) {
            await tx.glAccount.update({
              where: { id: item.glAccountId },
              data: { balance: { increment: item.lineTotal } }
            });
          }
        }
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

// --- A/P INVOICES ---

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
        where.status = DocumentStatus.CLOSED;
      } else {
        where.status = DocumentStatus.OPEN;
      }
    }

    if (filters.overdue) {
      where.dueDate = { lt: new Date() };
      where.status = DocumentStatus.OPEN;
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
        
        const journalEntry = await tx.journalEntry.create({
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

        await tx.aPInvoice.update({
          where: { id: invoice.id },
          data: { journalEntryId: journalEntry.id }
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

// --- INCOMING PAYMENTS ---

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
        
        const journalEntry = await tx.journalEntry.create({
          data: {
            docNum: jeDocNum,
            postingDate: data.paymentDate,
            remarks: `Customer Payment ${docNum}`,
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

        await tx.incomingPayment.update({
          where: { id: incomingPayment.id },
          data: { journalEntryId: journalEntry.id }
        });

        // Update balances
        await tx.glAccount.update({
          where: { id: bankAccount.glAccount.id },
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
      message: `Payment ${docNum} recorded successfully`
    };
  } catch (error) {
    console.error('Error creating incoming payment:', error);
    return { success: false, error: 'Failed to record payment' };
  }
}

// --- OUTGOING PAYMENTS ---

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
        
        const journalEntry = await tx.journalEntry.create({
          data: {
            docNum: jeDocNum,
            postingDate: data.paymentDate,
            remarks: `Vendor Payment ${docNum}`,
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

        await tx.outgoingPayment.update({
          where: { id: outgoingPayment.id },
          data: { journalEntryId: journalEntry.id }
        });

        // Update balances
        await tx.glAccount.update({
          where: { id: apAccount.id },
          data: { balance: { decrement: data.amount } }
        });

        await tx.glAccount.update({
          where: { id: bankAccount.glAccount.id },
          data: { balance: { decrement: data.amount } }
        });
      }

      return outgoingPayment;
    });

    revalidatePath(`/${data.businessUnitId}/outgoing-payments`);
    
    return {
      success: true,
      data: payment,
      message: `Payment ${docNum} recorded successfully`
    };
  } catch (error) {
    console.error('Error creating outgoing payment:', error);
    return { success: false, error: 'Failed to record payment' };
  }
}

// --- ACCOUNTING PERIODS ---

export async function validateAccountingPeriod(periodId: string): Promise<AccountingPeriodValidation> {
  try {
    const period = await prismadb.accountingPeriod.findUnique({
      where: { id: periodId },
      include: {
        journalEntries: {
          include: {
            lines: true
          }
        }
      }
    });

    if (!period) {
      return {
        isValid: false,
        canClose: false,
        errors: ['Period not found'],
        warnings: []
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if all journal entries are balanced
    for (const je of period.journalEntries) {
      const totalDebits = je.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
      const totalCredits = je.lines.reduce((sum, line) => sum + (line.credit || 0), 0);
      
      if (Math.abs(totalDebits - totalCredits) >= 0.01) {
        errors.push(`Journal Entry ${je.docNum} is not balanced`);
      }
    }

    // Check for unposted transactions
    const unpostedCount = await prismadb.journalEntry.count({
      where: {
        businessUnitId: period.businessUnitId,
        postingDate: {
          gte: period.startDate,
          lte: period.endDate
        },
        approverId: null
      }
    });

    if (unpostedCount > 0) {
      warnings.push(`${unpostedCount} journal entries are not yet approved`);
    }

    // Check for open A/R and A/P invoices
    const openARCount = await prismadb.aRInvoice.count({
      where: {
        businessUnitId: period.businessUnitId,
        status: DocumentStatus.OPEN,
        postingDate: {
          gte: period.startDate,
          lte: period.endDate
        }
      }
    });

    const openAPCount = await prismadb.aPInvoice.count({
      where: {
        businessUnitId: period.businessUnitId,
        status: DocumentStatus.OPEN,
        postingDate: {
          gte: period.startDate,
          lte: period.endDate
        }
      }
    });

    if (openARCount > 0) {
      warnings.push(`${openARCount} A/R invoices are still open`);
    }

    if (openAPCount > 0) {
      warnings.push(`${openAPCount} A/P invoices are still open`);
    }

    return {
      isValid: errors.length === 0,
      canClose: errors.length === 0,
      errors,
      warnings
    };
  } catch (error) {
    console.error('Error validating accounting period:', error);
    return {
      isValid: false,
      canClose: false,
      errors: ['Failed to validate period'],
      warnings: []
    };
  }
}

export async function closeAccountingPeriod(periodId: string): Promise<FinancialApiResponse<void>> {
  try {
    const user = await getAuthenticatedUser();
    
    const validation = await validateAccountingPeriod(periodId);
    if (!validation.canClose) {
      return { success: false, error: validation.errors.join(', ') };
    }

    await prismadb.accountingPeriod.update({
      where: { id: periodId },
      data: { status: PeriodStatus.CLOSED }
    });

    const period = await prismadb.accountingPeriod.findUnique({
      where: { id: periodId },
      select: { businessUnitId: true }
    });

    if (period) {
      revalidatePath(`/${period.businessUnitId}/accounting-periods`);
    }
    
    return {
      success: true,
      message: 'Accounting period closed successfully'
    };
  } catch (error) {
    console.error('Error closing accounting period:', error);
    return { success: false, error: 'Failed to close accounting period' };
  }
}

// --- FINANCIAL DASHBOARD ---

export async function getFinancialDashboard(businessUnitId: string): Promise<FinancialDashboardData> {
  try {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31);

    // Get account balances by type
    const accounts = await prismadb.glAccount.findMany({
      where: { businessUnitId },
      include: { accountType: true }
    });

    const totalAssets = accounts
      .filter(acc => acc.accountType.name === 'ASSET')
      .reduce((sum, acc) => sum + acc.balance, 0);

    const totalLiabilities = accounts
      .filter(acc => acc.accountType.name === 'LIABILITY')
      .reduce((sum, acc) => sum + acc.balance, 0);

    const totalEquity = accounts
      .filter(acc => acc.accountType.name === 'EQUITY')
      .reduce((sum, acc) => sum + acc.balance, 0);

    const totalRevenue = accounts
      .filter(acc => acc.accountType.name === 'REVENUE')
      .reduce((sum, acc) => sum + acc.balance, 0);

    const totalExpenses = accounts
      .filter(acc => acc.accountType.name === 'EXPENSE')
      .reduce((sum, acc) => sum + acc.balance, 0);

    const netIncome = totalRevenue - totalExpenses;

    // Cash flow calculation
    const cashAccounts = accounts.filter(acc => 
      acc.accountType.name === 'ASSET' && 
      (acc.name.toLowerCase().includes('cash') || acc.name.toLowerCase().includes('bank'))
    );
    const cashFlow = cashAccounts.reduce((sum, acc) => sum + acc.balance, 0);

    // A/R and A/P totals
    const accountsReceivable = accounts
      .filter(acc => acc.name.toLowerCase().includes('receivable'))
      .reduce((sum, acc) => sum + acc.balance, 0);

    const accountsPayable = accounts
      .filter(acc => acc.name.toLowerCase().includes('payable'))
      .reduce((sum, acc) => sum + acc.balance, 0);

    // Monthly revenue and expenses
    const monthlyData = await prismadb.journalEntryLine.findMany({
      where: {
        journalEntry: {
          businessUnitId,
          postingDate: {
            gte: startOfYear,
            lte: endOfYear
          }
        },
        glAccount: {
          accountType: {
            name: { in: ['REVENUE', 'EXPENSE'] }
          }
        }
      },
      include: {
        glAccount: { include: { accountType: true } },
        journalEntry: true
      }
    });

    const monthlyRevenue = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(currentYear, i).toLocaleString('default', { month: 'short' }),
      amount: 0
    }));

    const monthlyExpenses = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(currentYear, i).toLocaleString('default', { month: 'short' }),
      amount: 0
    }));

    monthlyData.forEach(line => {
      const month = line.journalEntry.postingDate.getMonth();
      const amount = (line.credit || 0) - (line.debit || 0);
      
      if (line.glAccount.accountType.name === 'REVENUE') {
        monthlyRevenue[month].amount += amount;
      } else if (line.glAccount.accountType.name === 'EXPENSE') {
        monthlyExpenses[month].amount += Math.abs(amount);
      }
    });

    // Top customers and vendors
    const topCustomers = await prismadb.businessPartner.findMany({
      where: {
        businessUnitId,
        type: BusinessPartnerType.CUSTOMER,
        arInvoices: { some: {} }
      },
      include: {
        arInvoices: {
          where: { status: DocumentStatus.CLOSED }
        }
      },
      take: 5
    });

    const topVendors = await prismadb.businessPartner.findMany({
      where: {
        businessUnitId,
        type: BusinessPartnerType.VENDOR,
        apInvoices: { some: {} }
      },
      include: {
        apInvoices: {
          where: { status: DocumentStatus.CLOSED }
        }
      },
      take: 5
    });

    // Aging analysis
    const today = new Date();
    const agingReceivables = [
      { period: 'Current', amount: 0 },
      { period: '1-30 days', amount: 0 },
      { period: '31-60 days', amount: 0 },
      { period: '60+ days', amount: 0 }
    ];

    const agingPayables = [
      { period: 'Current', amount: 0 },
      { period: '1-30 days', amount: 0 },
      { period: '31-60 days', amount: 0 },
      { period: '60+ days', amount: 0 }
    ];

    // Cash flow trend (simplified)
    const cashFlowTrend = monthlyRevenue.map((rev, index) => ({
      month: rev.month,
      inflow: rev.amount,
      outflow: monthlyExpenses[index].amount,
      net: rev.amount - monthlyExpenses[index].amount
    }));

    // Profit margin trend
    const profitMarginTrend = monthlyRevenue.map((rev, index) => ({
      month: rev.month,
      margin: rev.amount > 0 ? ((rev.amount - monthlyExpenses[index].amount) / rev.amount) * 100 : 0
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
      topCustomers: topCustomers.map(c => ({
        name: c.name,
        amount: c.arInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
      })),
      topVendors: topVendors.map(v => ({
        name: v.name,
        amount: v.apInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
      })),
      agingReceivables,
      agingPayables,
      cashFlowTrend,
      profitMarginTrend
    };
  } catch (error) {
    console.error('Error generating financial dashboard:', error);
    return {
      totalRevenue: 0,
      totalExpenses: 0,
      netIncome: 0,
      totalAssets: 0,
      totalLiabilities: 0,
      totalEquity: 0,
      cashFlow: 0,
      accountsReceivable: 0,
      accountsPayable: 0,
      monthlyRevenue: [],
      monthlyExpenses: [],
      topCustomers: [],
      topVendors: [],
      agingReceivables: [],
      agingPayables: [],
      cashFlowTrend: [],
      profitMarginTrend: []
    };
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

export async function generateBalanceSheet(businessUnitId: string, asOfDate?: Date): Promise<FinancialReportData> {
  try {
    const accounts = await prismadb.glAccount.findMany({
      where: { businessUnitId },
      include: { accountType: true },
      orderBy: { accountCode: 'asc' }
    });

    const assets = accounts
      .filter(acc => acc.accountType.name === 'ASSET')
      .map(acc => ({
        accountCode: acc.accountCode,
        accountName: acc.name,
        balance: acc.balance,
        level: 1,
        isHeader: false
      }));

    const liabilities = accounts
      .filter(acc => acc.accountType.name === 'LIABILITY')
      .map(acc => ({
        accountCode: acc.accountCode,
        accountName: acc.name,
        balance: acc.balance,
        level: 1,
        isHeader: false
      }));

    const equity = accounts
      .filter(acc => acc.accountType.name === 'EQUITY')
      .map(acc => ({
        accountCode: acc.accountCode,
        accountName: acc.name,
        balance: acc.balance,
        level: 1,
        isHeader: false
      }));

    const revenue = accounts
      .filter(acc => acc.accountType.name === 'REVENUE')
      .map(acc => ({
        accountCode: acc.accountCode,
        accountName: acc.name,
        amount: acc.balance,
        level: 1,
        isHeader: false
      }));

    const expenses = accounts
      .filter(acc => acc.accountType.name === 'EXPENSE')
      .map(acc => ({
        accountCode: acc.accountCode,
        accountName: acc.name,
        amount: acc.balance,
        level: 1,
        isHeader: false
      }));

    const totalAssets = assets.reduce((sum, acc) => sum + acc.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, acc) => sum + acc.balance, 0);
    const totalEquity = equity.reduce((sum, acc) => sum + acc.balance, 0);
    const totalRevenue = revenue.reduce((sum, acc) => sum + acc.amount, 0);
    const totalExpenses = expenses.reduce((sum, acc) => sum + acc.amount, 0);
    const netIncome = totalRevenue - totalExpenses;

    return {
      assets,
      liabilities,
      equity,
      revenue,
      expenses,
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalRevenue,
      totalExpenses,
      netIncome
    };
  } catch (error) {
    console.error('Error generating balance sheet:', error);
    return {
      assets: [],
      liabilities: [],
      equity: [],
      revenue: [],
      expenses: [],
      totalAssets: 0,
      totalLiabilities: 0,
      totalEquity: 0,
      totalRevenue: 0,
      totalExpenses: 0,
      netIncome: 0
    };
  }
}

export async function generateIncomeStatement(
  businessUnitId: string, 
  startDate: Date, 
  endDate: Date
): Promise<FinancialReportData> {
  try {
    const journalLines = await prismadb.journalEntryLine.findMany({
      where: {
        journalEntry: {
          businessUnitId,
          postingDate: {
            gte: startDate,
            lte: endDate
          }
        },
        glAccount: {
          accountType: {
            name: { in: ['REVENUE', 'EXPENSE'] }
          }
        }
      },
      include: {
        glAccount: { include: { accountType: true } },
        journalEntry: true
      }
    });

    const revenueMap = new Map<string, { accountCode: string; accountName: string; amount: number }>();
    const expenseMap = new Map<string, { accountCode: string; accountName: string; amount: number }>();

    journalLines.forEach(line => {
      const amount = (line.credit || 0) - (line.debit || 0);
      const key = line.glAccount.accountCode;
      
      if (line.glAccount.accountType.name === 'REVENUE') {
        const existing = revenueMap.get(key) || { 
          accountCode: line.glAccount.accountCode, 
          accountName: line.glAccount.name, 
          amount: 0 
        };
        existing.amount += amount;
        revenueMap.set(key, existing);
      } else if (line.glAccount.accountType.name === 'EXPENSE') {
        const existing = expenseMap.get(key) || { 
          accountCode: line.glAccount.accountCode, 
          accountName: line.glAccount.name, 
          amount: 0 
        };
        existing.amount += Math.abs(amount);
        expenseMap.set(key, existing);
      }
    });

    const revenue = Array.from(revenueMap.values()).map(item => ({
      ...item,
      level: 1,
      isHeader: false
    }));

    const expenses = Array.from(expenseMap.values()).map(item => ({
      ...item,
      level: 1,
      isHeader: false
    }));

    const totalRevenue = revenue.reduce((sum, acc) => sum + acc.amount, 0);
    const totalExpenses = expenses.reduce((sum, acc) => sum + acc.amount, 0);
    const netIncome = totalRevenue - totalExpenses;

    return {
      assets: [],
      liabilities: [],
      equity: [],
      revenue,
      expenses,
      totalAssets: 0,
      totalLiabilities: 0,
      totalEquity: 0,
      totalRevenue,
      totalExpenses,
      netIncome
    };
  } catch (error) {
    console.error('Error generating income statement:', error);
    return {
      assets: [],
      liabilities: [],
      equity: [],
      revenue: [],
      expenses: [],
      totalAssets: 0,
      totalLiabilities: 0,
      totalEquity: 0,
      totalRevenue: 0,
      totalExpenses: 0,
      netIncome: 0
    };
  }
}

// --- FINANCIAL RATIOS ---

export async function calculateFinancialRatios(businessUnitId: string): Promise<FinancialRatios> {
  try {
    const accounts = await prismadb.glAccount.findMany({
      where: { businessUnitId },
      include: { accountType: true }
    });

    const currentAssets = accounts
      .filter(acc => acc.accountType.name === 'ASSET' && 
        (acc.name.toLowerCase().includes('cash') || 
         acc.name.toLowerCase().includes('receivable') ||
         acc.name.toLowerCase().includes('inventory')))
      .reduce((sum, acc) => sum + acc.balance, 0);

    const totalAssets = accounts
      .filter(acc => acc.accountType.name === 'ASSET')
      .reduce((sum, acc) => sum + acc.balance, 0);

    const currentLiabilities = accounts
      .filter(acc => acc.accountType.name === 'LIABILITY' && 
        acc.name.toLowerCase().includes('payable'))
      .reduce((sum, acc) => sum + acc.balance, 0);

    const totalLiabilities = accounts
      .filter(acc => acc.accountType.name === 'LIABILITY')
      .reduce((sum, acc) => sum + acc.balance, 0);

    const totalEquity = accounts
      .filter(acc => acc.accountType.name === 'EQUITY')
      .reduce((sum, acc) => sum + acc.balance, 0);

    const totalRevenue = accounts
      .filter(acc => acc.accountType.name === 'REVENUE')
      .reduce((sum, acc) => sum + acc.balance, 0);

    const totalExpenses = accounts
      .filter(acc => acc.accountType.name === 'EXPENSE')
      .reduce((sum, acc) => sum + acc.balance, 0);

    const netIncome = totalRevenue - totalExpenses;

    const cash = accounts
      .filter(acc => acc.name.toLowerCase().includes('cash'))
      .reduce((sum, acc) => sum + acc.balance, 0);

    const inventory = accounts
      .filter(acc => acc.name.toLowerCase().includes('inventory'))
      .reduce((sum, acc) => sum + acc.balance, 0);

    // Calculate ratios
    const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;
    const quickRatio = currentLiabilities > 0 ? (currentAssets - inventory) / currentLiabilities : 0;
    const cashRatio = currentLiabilities > 0 ? cash / currentLiabilities : 0;

    const grossProfitMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0;
    const netProfitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;
    const returnOnAssets = totalAssets > 0 ? (netIncome / totalAssets) * 100 : 0;
    const returnOnEquity = totalEquity > 0 ? (netIncome / totalEquity) * 100 : 0;

    const assetTurnover = totalAssets > 0 ? totalRevenue / totalAssets : 0;
    const receivablesTurnover = 0; // Would need average receivables calculation
    const payablesTurnover = 0; // Would need average payables calculation

    const debtToEquity = totalEquity > 0 ? totalLiabilities / totalEquity : 0;
    const debtToAssets = totalAssets > 0 ? totalLiabilities / totalAssets : 0;

    return {
      liquidity: {
        currentRatio,
        quickRatio,
        cashRatio
      },
      profitability: {
        grossProfitMargin,
        netProfitMargin,
        returnOnAssets,
        returnOnEquity
      },
      efficiency: {
        assetTurnover,
        receivablesTurnover,
        payablesTurnover,
        inventoryTurnover: 0
      },
      leverage: {
        debtToEquity,
        debtToAssets,
        equityMultiplier: totalEquity > 0 ? totalAssets / totalEquity : 0
      }
    };
  } catch (error) {
    console.error('Error calculating financial ratios:', error);
    return {
      liquidity: { currentRatio: 0, quickRatio: 0, cashRatio: 0 },
      profitability: { grossProfitMargin: 0, netProfitMargin: 0, returnOnAssets: 0, returnOnEquity: 0 },
      efficiency: { assetTurnover: 0, receivablesTurnover: 0, payablesTurnover: 0, inventoryTurnover: 0 },
      leverage: { debtToEquity: 0, debtToAssets: 0, equityMultiplier: 0 }
    };
  }
}