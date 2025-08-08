"use server";

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import prismadb from '@/lib/db';
import { DocumentType, DocumentStatus, BusinessPartnerType, PeriodStatus, Prisma } from '@prisma/client';
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
  CreateGlAccountData,
  UpdateGlAccountData,
  CreateJournalEntryData,
  ARInvoiceWithDetails,
  APInvoiceWithDetails,
  IncomingPaymentWithDetails,
  OutgoingPaymentWithDetails,
  DepositWithDetails,
  BankAccountWithDetails,
  AccountingPeriodWithDetails,
  GlAccountWithDetails,
  JournalEntryWithDetails,
  FinancialFilters,
  ARInvoiceFilters,
  APInvoiceFilters,
  BankAccountFilters,
  AccountingPeriodFilters,
  JournalEntryFilters,
  AgingAnalysis,
  FinancialRatios,
  CashFlowStatement,
  JournalEntryValidation,
  AccountingPeriodValidation,
  FinancialReportData,
  GlAccountOption
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

// --- GL ACCOUNTS ACTIONS ---

export async function createGlAccount(data: CreateGlAccountData): Promise<FinancialApiResponse<GlAccountWithDetails>> {
  try {
    const user = await getAuthenticatedUser();
    
    // Check if account code already exists
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

export async function updateGlAccount(data: UpdateGlAccountData): Promise<FinancialApiResponse<GlAccountWithDetails>> {
  try {
    const user = await getAuthenticatedUser();
    
    // Check if account code already exists (excluding current account)
    const existingAccount = await prismadb.glAccount.findFirst({
      where: { 
        accountCode: data.accountCode,
        NOT: { id: data.id }
      }
    });
    
    if (existingAccount) {
      return { success: false, error: 'Account code already exists' };
    }

    const glAccount = await prismadb.glAccount.update({
      where: { id: data.id },
      data: {
        accountCode: data.accountCode,
        name: data.name,
        accountTypeId: data.accountTypeId,
        balance: data.balance,
      },
      include: {
        accountType: true,
        businessUnit: { select: { id: true, name: true } },
        _count: {
          select: { journalLines: true }
        }
      }
    });

    revalidatePath(`/${glAccount.businessUnitId}/chart-of-accounts`);
    
    return {
      success: true,
      data: glAccount,
      message: 'Account updated successfully'
    };
  } catch (error) {
    console.error('Error updating GL account:', error);
    return { success: false, error: 'Failed to update GL account' };
  }
}

export async function deleteGlAccount(id: string): Promise<FinancialApiResponse<void>> {
  try {
    const user = await getAuthenticatedUser();
    
    // Check if account has transactions
    const transactionCount = await prismadb.journalEntryLine.count({
      where: { glAccountCode: id }
    });
    
    if (transactionCount > 0) {
      return { success: false, error: 'Cannot delete account with existing transactions' };
    }

    const account = await prismadb.glAccount.findUnique({
      where: { id },
      select: { businessUnitId: true }
    });

    await prismadb.glAccount.delete({
      where: { id }
    });

    if (account) {
      revalidatePath(`/${account.businessUnitId}/chart-of-accounts`);
    }
    
    return {
      success: true,
      message: 'Account deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting GL account:', error);
    return { success: false, error: 'Failed to delete GL account' };
  }
}

// --- JOURNAL ENTRY ACTIONS ---

export async function validateJournalEntry(lines: CreateJournalEntryData['lines']): Promise<JournalEntryValidation> {
  const totalDebits = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredits = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;
  
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (lines.length < 2) {
    errors.push('Journal entry must have at least 2 lines');
  }
  
  if (!isBalanced) {
    errors.push(`Entry is not balanced. Debits: ${totalDebits.toFixed(2)}, Credits: ${totalCredits.toFixed(2)}`);
  }
  
  lines.forEach((line, index) => {
    if (!line.debit && !line.credit) {
      errors.push(`Line ${index + 1}: Must have either debit or credit amount`);
    }
    if (line.debit && line.credit) {
      errors.push(`Line ${index + 1}: Cannot have both debit and credit amounts`);
    }
    if ((line.debit && line.debit <= 0) || (line.credit && line.credit <= 0)) {
      errors.push(`Line ${index + 1}: Amount must be greater than 0`);
    }
  });

  return {
    isBalanced,
    totalDebits,
    totalCredits,
    errors,
    warnings
  };
}

export async function createJournalEntry(data: CreateJournalEntryData): Promise<FinancialApiResponse<JournalEntryWithDetails>> {
  try {
    const user = await getAuthenticatedUser();
    
    // Validate the journal entry
    const validation = await validateJournalEntry(data.lines);
    if (!validation.isBalanced || validation.errors.length > 0) {
      return { success: false, error: validation.errors.join(', ') };
    }

    // Get next document number
    const docNum = await getNextDocumentNumber(DocumentType.JOURNAL_ENTRY, data.businessUnitId);

    // Get current open accounting period
    const openPeriod = await prismadb.accountingPeriod.findFirst({
      where: {
        businessUnitId: data.businessUnitId,
        status: PeriodStatus.OPEN,
        startDate: { lte: data.postingDate },
        endDate: { gte: data.postingDate }
      }
    });

    if (!openPeriod) {
      return { success: false, error: 'No open accounting period found for the posting date' };
    }

    const journalEntry = await prismadb.$transaction(async (tx) => {
      // Create the journal entry
      const entry = await tx.journalEntry.create({
        data: {
          docNum,
          postingDate: data.postingDate,
          remarks: data.remarks,
          authorId: user.id,
          businessUnitId: data.businessUnitId,
          accountingPeriodId: openPeriod.id,
          lines: {
            create: data.lines.map(line => ({
              glAccountCode: line.glAccountCode,
              debit: line.debit,
              credit: line.credit,
            }))
          }
        },
        include: {
          author: { select: { id: true, name: true } },
          approver: { select: { id: true, name: true } },
          lines: {
            include: {
              glAccount: true
            }
          },
          businessUnit: { select: { id: true, name: true } },
          accountingPeriod: { select: { id: true, name: true } }
        }
      });

      // Update account balances
      for (const line of data.lines) {
        const account = await tx.glAccount.findUnique({
          where: { accountCode: line.glAccountCode },
          include: { accountType: true }
        });

        if (account) {
          let balanceChange = 0;
          
          if (['ASSET', 'EXPENSE'].includes(account.accountType.name)) {
            balanceChange = (line.debit || 0) - (line.credit || 0);
          } else {
            balanceChange = (line.credit || 0) - (line.debit || 0);
          }

          await tx.glAccount.update({
            where: { id: account.id },
            data: { balance: { increment: balanceChange } }
          });
        }
      }
      
      // Manually add journalEntry to lines to match the return type
      const finalEntry: JournalEntryWithDetails = {
          ...entry,
          lines: entry.lines.map(line => ({
              ...line,
              journalEntry: {
                  id: entry.id,
                  docNum: entry.docNum,
                  postingDate: entry.postingDate
              }
          }))
      };

      return finalEntry;
    });

    revalidatePath(`/${data.businessUnitId}/journal-entry`);
    
    return {
      success: true,
      data: journalEntry,
      message: `Journal Entry ${docNum} created successfully`
    };
  } catch (error) {
    console.error('Error creating journal entry:', error);
    return { success: false, error: 'Failed to create journal entry' };
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
          journalEntry: true,
          baseDelivery: { select: { id: true, docNum: true } },
          orders: { select: { id: true, totalAmount: true } }
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
                {
                  glAccountCode: revenueAccount.accountCode,
                  credit: totalAmount
                }
              ]
            }
          }
        });

        // Link journal entry to invoice
        await tx.aRInvoice.update({
          where: { id: invoice.id },
          data: { journalEntryId: journalEntry.id }
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

      const apAccount = await tx.glAccount.findFirst({
        where: { 
          businessUnitId: data.businessUnitId,
          accountType: { name: 'LIABILITY' },
          name: { contains: 'Payable' }
        }
      });

      if (apAccount) {
        const jeDocNum = await getNextDocumentNumber(DocumentType.JOURNAL_ENTRY, data.businessUnitId);
        
        // FIX: Fetch account codes for journal entry lines
        const itemGlAccountIds = data.items.map(item => item.glAccountId);
        const itemGlAccounts = await tx.glAccount.findMany({
            where: { id: { in: itemGlAccountIds } },
            select: { id: true, accountCode: true }
        });
        const glAccountCodeMap = new Map(itemGlAccounts.map(acc => [acc.id, acc.accountCode]));

        const journalEntry = await tx.journalEntry.create({
          data: {
            docNum: jeDocNum,
            postingDate: data.postingDate,
            remarks: `A/P Invoice ${docNum}`,
            authorId: user.id,
            businessUnitId: data.businessUnitId,
            lines: {
              create: [
                ...data.items.map(item => {
                    const accountCode = glAccountCodeMap.get(item.glAccountId);
                    if (!accountCode) {
                        throw new Error(`Could not find account code for GL Account ID: ${item.glAccountId}`);
                    }
                    return {
                        glAccountCode: accountCode,
                        debit: item.lineTotal
                    };
                }),
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

// --- BANKING ACTIONS ---

export async function createBankAccount(data: CreateBankAccountData): Promise<FinancialApiResponse<BankAccountWithDetails>> {
  try {
    const user = await getAuthenticatedUser();

    // Check if account number already exists
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

        // Link journal entry to payment
        await tx.incomingPayment.update({
          where: { id: incomingPayment.id },
          data: { journalEntryId: journalEntry.id }
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
        
        const journalEntry = await tx.journalEntry.create({
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

        // Link journal entry to payment
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

export async function validateAccountingPeriod(periodId: string): Promise<AccountingPeriodValidation> {
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
    const [openARInvoices, openAPInvoices] = await Promise.all([
      prismadb.aRInvoice.count({
        where: {
          businessUnitId: period.businessUnitId,
          postingDate: { gte: period.startDate, lte: period.endDate },
          status: DocumentStatus.OPEN
        }
      }),
      prismadb.aPInvoice.count({
        where: {
          businessUnitId: period.businessUnitId,
          postingDate: { gte: period.startDate, lte: period.endDate },
          status: DocumentStatus.OPEN
        }
      })
    ]);

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

export async function closeAccountingPeriod(periodId: string): Promise<FinancialApiResponse<AccountingPeriodWithDetails>> {
  try {
    const user = await getAuthenticatedUser();

    const validation = await validateAccountingPeriod(periodId);
    if (!validation.canClose) {
      return { success: false, error: validation.errors.join(', ') };
    }

    const period = await prismadb.accountingPeriod.findUnique({
      where: { id: periodId }
    });

    if (!period) {
      return { success: false, error: 'Accounting period not found' };
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

// --- FINANCIAL DASHBOARD ---

export async function getFinancialDashboard(businessUnitId: string): Promise<FinancialDashboardData> {
  try {
    const currentYear = new Date().getFullYear();

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
    const [arInvoices, apInvoices] = await Promise.all([
      prismadb.aRInvoice.findMany({
        where: { 
          businessUnitId,
          status: DocumentStatus.OPEN
        }
      }),
      prismadb.aPInvoice.findMany({
        where: { 
          businessUnitId,
          status: DocumentStatus.OPEN
        }
      })
    ]);

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
    const [customers, vendors] = await Promise.all([
      prismadb.businessPartner.findMany({
        where: { 
          businessUnitId,
          type: BusinessPartnerType.CUSTOMER
        },
        take: 5
      }),
      prismadb.businessPartner.findMany({
        where: { 
          businessUnitId,
          type: BusinessPartnerType.VENDOR
        },
        take: 5
      })
    ]);

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

export async function generateFinancialReports(businessUnitId: string): Promise<FinancialReportData> {
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
    console.error('Error generating financial reports:', error);
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

    // This map function transforms the data to match the GlAccountOption type.
    // It takes the nested accountType object and extracts the name string.
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

export async function getJournalEntries(
  filters: JournalEntryFilters,
  pagination: { page: number; limit: number } = { page: 1, limit: 20 }
): Promise<PaginatedFinancialResponse<JournalEntryWithDetails>> {
  try {
    const where: any = {
      businessUnitId: filters.businessUnitId,
    };

    if (filters.authorId) where.authorId = filters.authorId;
    if (filters.approverId) where.approverId = filters.approverId;
    if (filters.accountingPeriodId) where.accountingPeriodId = filters.accountingPeriodId;
    
    if (filters.dateFrom || filters.dateTo) {
      where.postingDate = {};
      if (filters.dateFrom) where.postingDate.gte = filters.dateFrom;
      if (filters.dateTo) where.postingDate.lte = filters.dateTo;
    }

    if (filters.searchTerm) {
      where.OR = [
        { docNum: { contains: filters.searchTerm, mode: 'insensitive' } },
        { remarks: { contains: filters.searchTerm, mode: 'insensitive' } }
      ];
    }

    const [total, data] = await prismadb.$transaction([
      prismadb.journalEntry.count({ where }),
      prismadb.journalEntry.findMany({
        where,
        include: {
          author: { select: { id: true, name: true } },
          approver: { select: { id: true, name: true } },
          lines: {
            include: {
              glAccount: true,
              journalEntry: {
                  select: {
                      id: true,
                      docNum: true,
                      postingDate: true
                  }
              }
            }
          },
          businessUnit: { select: { id: true, name: true } },
          accountingPeriod: { select: { id: true, name: true } }
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
    console.error('Error fetching journal entries:', error);
    return {
      data: [],
      pagination: { ...pagination, total: 0, totalPages: 0 }
    };
  }
}

// --- AGING ANALYSIS ---

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

// --- BALANCE SHEET ---

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

// --- INCOME STATEMENT ---

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
