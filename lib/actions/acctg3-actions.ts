"use server";

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import prismadb from '@/lib/db';
import { Prisma, DocumentStatus, AccountType } from '@prisma/client';
import {
  CreateGlAccountData,
  UpdateGlAccountData,
  CreateJournalEntryData,
  UpdateJournalEntryData,
  GlAccountFilters,
  JournalEntryFilters,
  GlAccountWithType,
  JournalEntryWithDetails,
  TrialBalanceItem,
  FinancialReportData,
  AccountingApiResponse,
  PaginatedAccountingResponse,
  JournalEntryValidation,
  JournalEntryLineWithAccount
} from '@/types/acctg-types';

// --- AUTHENTICATION HELPER ---
async function getAuthenticatedUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthenticated');
  }
  return session.user;
}

// --- GL ACCOUNT ACTIONS ---

export async function createGlAccount(data: CreateGlAccountData): Promise<AccountingApiResponse<GlAccountWithType>> {
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

export async function updateGlAccount(data: UpdateGlAccountData): Promise<AccountingApiResponse<GlAccountWithType>> {
  try {
    const user = await getAuthenticatedUser();
    
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

export async function deleteGlAccount(id: string): Promise<AccountingApiResponse<void>> {
  try {
    const user = await getAuthenticatedUser();
    
    // Check if account has transactions
    const transactionCount = await prismadb.journalEntryLine.count({
      where: { glAccountCode: { in: [id] } }
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

export async function getGlAccounts(filters: GlAccountFilters): Promise<GlAccountWithType[]> {
  try {
    const where: Prisma.GlAccountWhereInput = {
      businessUnitId: filters.businessUnitId,
    };

    if (filters.accountTypeId) {
      where.accountTypeId = filters.accountTypeId;
    }

    if (filters.searchTerm) {
      where.OR = [
        { accountCode: { contains: filters.searchTerm, mode: 'insensitive' } },
        { name: { contains: filters.searchTerm, mode: 'insensitive' } }
      ];
    }

    if (filters.hasBalance !== undefined) {
      where.balance = filters.hasBalance ? { not: 0 } : 0;
    }

    const accounts = await prismadb.glAccount.findMany({
      where,
      include: {
        accountType: true,
        _count: {
          select: { journalLines: true }
        }
      },
      orderBy: { accountCode: 'asc' }
    });

    return accounts;
  } catch (error) {
    console.error('Error fetching GL accounts:', error);
    return [];
  }
}

export async function getAccountTypes(): Promise<AccountType[]> {
  try {
    return await prismadb.accountType.findMany({
      orderBy: { name: 'asc' }
    });
  } catch (error) {
    console.error('Error fetching account types:', error);
    return [];
  }
}

// --- JOURNAL ENTRY ACTIONS ---

export async function validateJournalEntry(lines: CreateJournalEntryData['lines']): Promise<JournalEntryValidation> {
  const totalDebits = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredits = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01; // Allow for rounding
  
  const errors: string[] = [];
  
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
    errors
  };
}

export async function createJournalEntry(data: CreateJournalEntryData): Promise<AccountingApiResponse<JournalEntryWithDetails>> {
  try {
    const user = await getAuthenticatedUser();
    
    // Validate the journal entry
    const validation = await validateJournalEntry(data.lines);
    if (!validation.isBalanced || validation.errors.length > 0) {
      return { success: false, error: validation.errors.join(', ') };
    }

    // Get next document number
    const series = await prismadb.numberingSeries.findUnique({
      where: {
        documentType_businessUnitId: {
          documentType: 'JOURNAL_ENTRY',
          businessUnitId: data.businessUnitId
        }
      }
    });

    if (!series) {
      return { success: false, error: 'Numbering series not found for Journal Entries' };
    }

    const docNum = `${series.prefix}${series.nextNumber}`;

    const journalEntry = await prismadb.$transaction(async (tx) => {
      // Create the journal entry
      const entry = await tx.journalEntry.create({
        data: {
          docNum,
          postingDate: data.postingDate,
          remarks: data.remarks,
          authorId: user.id,
          businessUnitId: data.businessUnitId,
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
          }
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
          
          // Determine balance change based on account type and normal balance
          if (['ASSET', 'EXPENSE'].includes(account.accountType.name)) {
            // Normal debit balance accounts
            balanceChange = (line.debit || 0) - (line.credit || 0);
          } else {
            // Normal credit balance accounts (LIABILITY, EQUITY, REVENUE)
            balanceChange = (line.credit || 0) - (line.debit || 0);
          }

          await tx.glAccount.update({
            where: { id: account.id },
            data: { balance: { increment: balanceChange } }
          });
        }
      }

      // Update numbering series
      await tx.numberingSeries.update({
        where: { id: series.id },
        data: { nextNumber: { increment: 1 } }
      });

      return entry;
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

export async function getJournalEntries(
  filters: JournalEntryFilters,
  pagination: { page: number; limit: number } = { page: 1, limit: 20 }
): Promise<PaginatedAccountingResponse<JournalEntryWithDetails>> {
  try {
    const where: Prisma.JournalEntryWhereInput = {
      businessUnitId: filters.businessUnitId,
    };

    if (filters.authorId) where.authorId = filters.authorId;
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
              glAccount: true
            }
          }
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

export async function getJournalEntryById(id: string): Promise<JournalEntryWithDetails | null> {
  try {
    return await prismadb.journalEntry.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
        lines: {
          include: {
            glAccount: true
          }
        }
      }
    });
  } catch (error) {
    console.error('Error fetching journal entry:', error);
    return null;
  }
}

// --- FINANCIAL REPORTS ---

export async function generateTrialBalance(
  businessUnitId: string,
  asOfDate?: Date
): Promise<TrialBalanceItem[]> {
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

// --- ACCOUNT BALANCE INQUIRY ---

export async function getAccountBalance(accountCode: string): Promise<number> {
  try {
    const account = await prismadb.glAccount.findUnique({
      where: { accountCode },
      select: { balance: true }
    });
    
    return account?.balance || 0;
  } catch (error) {
    console.error('Error fetching account balance:', error);
    return 0;
  }
}

export async function getAccountTransactions(
  accountCode: string,
  limit: number = 50
): Promise<JournalEntryLineWithAccount[]> {
  try {
    return await prismadb.journalEntryLine.findMany({
      where: { glAccountCode: accountCode },
      include: {
        glAccount: true,
        journalEntry: {
          include: {
            author: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { journalEntry: { postingDate: 'desc' } },
      take: limit
    });
  } catch (error) {
    console.error('Error fetching account transactions:', error);
    return [];
  }
}