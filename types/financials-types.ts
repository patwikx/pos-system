import { 
  GlAccount, 
  AccountType, 
  JournalEntry, 
  JournalEntryLine,
  ARInvoice,
  ARInvoiceItem,
  APInvoice,
  APInvoiceItem,
  IncomingPayment,
  OutgoingPayment,
  Deposit,
  BankAccount,
  BusinessPartner,
  DocumentStatus,
  BusinessPartnerType,
  User,
  BusinessUnit
} from '@prisma/client';

// --- EXTENDED TYPES WITH RELATIONS ---

export type GlAccountWithDetails = GlAccount & {
  accountType: AccountType;
  _count: {
    journalLines: number;
  };
  balance: number;
};

export type JournalEntryWithDetails = JournalEntry & {
  author: Pick<User, 'id' | 'name'>;
  approver: Pick<User, 'id' | 'name'> | null;
  lines: JournalEntryLineWithAccount[];
  businessUnit: Pick<BusinessUnit, 'id' | 'name'>;
};

export type JournalEntryLineWithAccount = JournalEntryLine & {
  glAccount: GlAccount;
};

export type ARInvoiceWithDetails = ARInvoice & {
  businessPartner: Pick<BusinessPartner, 'bpCode' | 'name'>;
  businessUnit: Pick<BusinessUnit, 'id' | 'name'>;
  items: ARInvoiceItemWithDetails[];
  journalEntry: JournalEntry | null;
};

export type ARInvoiceItemWithDetails = ARInvoiceItem & {
  menuItem: { id: string; name: string };
  glAccount: Pick<GlAccount, 'id' | 'accountCode' | 'name'>;
};

export type APInvoiceWithDetails = APInvoice & {
  businessPartner: Pick<BusinessPartner, 'bpCode' | 'name'>;
  businessUnit: Pick<BusinessUnit, 'id' | 'name'>;
  items: APInvoiceItemWithDetails[];
  journalEntry: JournalEntry | null;
  basePurchaseOrder: { id: string; poNumber: string } | null;
};

export type APInvoiceItemWithDetails = APInvoiceItem & {
  glAccount: Pick<GlAccount, 'id' | 'accountCode' | 'name'>;
};

export type BankAccountWithDetails = BankAccount & {
  glAccount: GlAccount;
  businessUnit: Pick<BusinessUnit, 'id' | 'name'>;
  _count: {
    incomingPayments: number;
    outgoingPayments: number;
    deposits: number;
  };
};

export type IncomingPaymentWithDetails = IncomingPayment & {
  businessPartner: Pick<BusinessPartner, 'bpCode' | 'name'>;
  bankAccount: Pick<BankAccount, 'id' | 'name'>;
  journalEntry: JournalEntry | null;
};

export type OutgoingPaymentWithDetails = OutgoingPayment & {
  businessPartner: Pick<BusinessPartner, 'bpCode' | 'name'>;
  bankAccount: Pick<BankAccount, 'id' | 'name'>;
  journalEntry: JournalEntry | null;
};

export type DepositWithDetails = Deposit & {
  bankAccount: Pick<BankAccount, 'id' | 'name'>;
  journalEntry: JournalEntry | null;
};

// --- FORM DATA TYPES ---

export type CreateGlAccountData = {
  accountCode: string;
  name: string;
  accountTypeId: string;
  businessUnitId: string;
  balance?: number;
};

export type UpdateGlAccountData = CreateGlAccountData & {
  id: string;
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

export type CreateARInvoiceData = {
  businessUnitId: string;
  bpCode: string;
  baseDeliveryId?: string;
  postingDate: Date;
  dueDate: Date;
  documentDate: Date;
  remarks?: string;
  items: CreateARInvoiceItemData[];
};

export type CreateARInvoiceItemData = {
  itemCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  glAccountId: string;
};

export type CreateAPInvoiceData = {
  businessUnitId: string;
  bpCode: string;
  basePurchaseOrderId?: string;
  postingDate: Date;
  dueDate: Date;
  documentDate: Date;
  remarks?: string;
  items: CreateAPInvoiceItemData[];
};

export type CreateAPInvoiceItemData = {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  glAccountId: string;
};

export type CreateBankAccountData = {
  name: string;
  bankName: string;
  accountNumber: string;
  glAccountId: string;
  businessUnitId: string;
};

export type CreateIncomingPaymentData = {
  businessUnitId: string;
  bpCode: string;
  paymentDate: Date;
  amount: number;
  bankAccountId: string;
};

export type CreateOutgoingPaymentData = {
  businessUnitId: string;
  bpCode: string;
  paymentDate: Date;
  amount: number;
  bankAccountId: string;
};

export type CreateDepositData = {
  businessUnitId: string;
  bankAccountId: string;
  depositDate: Date;
  amount: number;
};

// --- FILTER TYPES ---

export type FinancialFilters = {
  businessUnitId: string;
  dateFrom?: Date;
  dateTo?: Date;
  searchTerm?: string;
  status?: DocumentStatus;
  accountTypeId?: string;
  bpCode?: string;
};

export type JournalEntryFilters = FinancialFilters & {
  authorId?: string;
  approverId?: string;
};

export type ARInvoiceFilters = FinancialFilters & {
  isPaid?: boolean;
  overdue?: boolean;
};

export type APInvoiceFilters = FinancialFilters & {
  isPaid?: boolean;
  overdue?: boolean;
};

// --- DASHBOARD & ANALYTICS TYPES ---

export type FinancialDashboardData = {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  cashFlow: number;
  accountsReceivable: number;
  accountsPayable: number;
  monthlyRevenue: { month: string; amount: number }[];
  monthlyExpenses: { month: string; amount: number }[];
  topCustomers: { name: string; amount: number }[];
  topVendors: { name: string; amount: number }[];
  agingReceivables: { period: string; amount: number }[];
  agingPayables: { period: string; amount: number }[];
};

export type TrialBalanceItem = {
  accountCode: string;
  accountName: string;
  accountType: string;
  debitBalance: number;
  creditBalance: number;
};

export type BalanceSheetData = {
  assets: {
    current: { accountCode: string; name: string; amount: number }[];
    nonCurrent: { accountCode: string; name: string; amount: number }[];
    totalAssets: number;
  };
  liabilities: {
    current: { accountCode: string; name: string; amount: number }[];
    nonCurrent: { accountCode: string; name: string; amount: number }[];
    totalLiabilities: number;
  };
  equity: {
    accounts: { accountCode: string; name: string; amount: number }[];
    retainedEarnings: number;
    totalEquity: number;
  };
};

export type IncomeStatementData = {
  revenue: { accountCode: string; name: string; amount: number }[];
  expenses: { accountCode: string; name: string; amount: number }[];
  totalRevenue: number;
  totalExpenses: number;
  grossProfit: number;
  netIncome: number;
};

export type CashFlowData = {
  operating: { description: string; amount: number }[];
  investing: { description: string; amount: number }[];
  financing: { description: string; amount: number }[];
  netCashFlow: number;
  beginningCash: number;
  endingCash: number;
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
  status: string;
  createdAt: string;
};

export type ARInvoiceColumn = {
  id: string;
  docNum: string;
  customerName: string;
  postingDate: string;
  dueDate: string;
  totalAmount: string;
  amountPaid: string;
  balance: string;
  status: DocumentStatus;
  overdue: boolean;
  createdAt: string;
};

export type APInvoiceColumn = {
  id: string;
  docNum: string;
  vendorName: string;
  postingDate: string;
  dueDate: string;
  totalAmount: string;
  amountPaid: string;
  balance: string;
  status: DocumentStatus;
  overdue: boolean;
  createdAt: string;
};

export type BankAccountColumn = {
  id: string;
  name: string;
  bankName: string;
  accountNumber: string;
  glAccountCode: string;
  balance: string;
  transactionCount: number;
  createdAt: string;
};

export type IncomingPaymentColumn = {
  id: string;
  docNum: string;
  customerName: string;
  paymentDate: string;
  amount: string;
  bankAccount: string;
  createdAt: string;
};

export type OutgoingPaymentColumn = {
  id: string;
  docNum: string;
  vendorName: string;
  paymentDate: string;
  amount: string;
  bankAccount: string;
  createdAt: string;
};

// --- API RESPONSE TYPES ---

export type FinancialApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export type PaginatedFinancialResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

// --- VALIDATION TYPES ---

export type JournalEntryValidation = {
  isBalanced: boolean;
  totalDebits: number;
  totalCredits: number;
  errors: string[];
  warnings: string[];
};

export type AccountingPeriodValidation = {
  isValid: boolean;
  errors: string[];
  warnings: string[];
};

// --- UTILITY TYPES ---

export type AccountTypeOption = {
  id: string;
  name: string;
};

export type BusinessPartnerOption = {
  bpCode: string;
  name: string;
  type: BusinessPartnerType;
};

export type GlAccountOption = {
  id: string;
  accountCode: string;
  name: string;
  accountType: string;
};

export type BankAccountOption = {
  id: string;
  name: string;
  bankName: string;
};

export type UserOption = {
  id: string;
  name: string | null;
};

// --- REPORT CONFIGURATION TYPES ---

export type ReportPeriod = {
  startDate: Date;
  endDate: Date;
  label: string;
};

export type ReportFormat = 'PDF' | 'EXCEL' | 'CSV';

export type ReportConfig = {
  period: ReportPeriod;
  format: ReportFormat;
  includeZeroBalances: boolean;
  groupByAccountType: boolean;
  showComparativePeriod: boolean;
};