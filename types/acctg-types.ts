import { 
  GlAccount, 
  AccountType, 
  JournalEntry, 
  JournalEntryLine, 
  DocumentStatus,
  FinancialReport,
  FinancialReportLine 
} from '@prisma/client';

// --- CORE TYPES WITH RELATIONS ---

export type GlAccountWithType = GlAccount & {
  accountType: AccountType;
  _count?: {
    journalLines: number;
  };
};

export type JournalEntryWithDetails = JournalEntry & {
  author: { id: string; name: string | null };
  approver: { id: string; name: string | null } | null;
  lines: JournalEntryLineWithAccount[];
};

export type JournalEntryLineWithAccount = JournalEntryLine & {
  glAccount: GlAccount;
};

export type FinancialReportWithLines = FinancialReport & {
  lines: FinancialReportLine[];
};

// --- FORM DATA TYPES ---

export type CreateGlAccountData = {
  accountCode: string;
  name: string;
  accountTypeId: string;
  businessUnitId: string;
  balance?: number;
};

export type UpdateGlAccountData = {
  id: string;
  accountCode: string;
  name: string;
  accountTypeId: string;
  balance?: number;
};

export type CreateJournalEntryLineData = {
  glAccountCode: string;
  debit?: number;
  credit?: number;
};

export type CreateJournalEntryData = {
  postingDate: Date;
  remarks?: string;
  businessUnitId: string;
  lines: CreateJournalEntryLineData[];
};

export type UpdateJournalEntryData = {
  id: string;
  postingDate: Date;
  remarks?: string;
  lines: CreateJournalEntryLineData[];
};

// --- FILTER & SEARCH TYPES ---

export type GlAccountFilters = {
  businessUnitId: string;
  accountTypeId?: string;
  searchTerm?: string;
  hasBalance?: boolean;
};

export type JournalEntryFilters = {
  businessUnitId: string;
  status?: DocumentStatus;
  authorId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  searchTerm?: string;
};

// --- COLUMN TYPES FOR DATA TABLES ---

export type GlAccountColumn = {
  id: string;
  accountCode: string;
  name: string;
  accountType: string;
  balance: string;
  transactionCount: number;
  createdAt: string;
};

export type JournalEntryColumn = {
  id: string;
  docNum: string;
  postingDate: string;
  author: string;
  remarks: string;
  totalDebit: string;
  totalCredit: string;
  status: DocumentStatus;
  createdAt: string;
};

export type AccountTypeColumn = {
  id: string;
  name: string;
  accountCount: number;
  totalBalance: string;
};

// --- FINANCIAL REPORT TYPES ---

export type TrialBalanceItem = {
  accountCode: string;
  accountName: string;
  accountType: string;
  debitBalance: number;
  creditBalance: number;
};

export type BalanceSheetItem = {
  accountCode: string;
  accountName: string;
  balance: number;
  level: number;
  isHeader: boolean;
};

export type IncomeStatementItem = {
  accountCode: string;
  accountName: string;
  amount: number;
  level: number;
  isHeader: boolean;
};

export type FinancialReportData = {
  assets: BalanceSheetItem[];
  liabilities: BalanceSheetItem[];
  equity: BalanceSheetItem[];
  revenue: IncomeStatementItem[];
  expenses: IncomeStatementItem[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
};

// --- API RESPONSE TYPES ---

export type AccountingApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export type PaginatedAccountingResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

// --- VALIDATION SCHEMAS ---

export type JournalEntryValidation = {
  isBalanced: boolean;
  totalDebits: number;
  totalCredits: number;
  errors: string[];
};