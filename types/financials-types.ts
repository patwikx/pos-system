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
  BusinessUnit,
  MenuItem,
  AccountingPeriod,
  PeriodStatus,
  FinancialReport,
  FinancialReportLine,
  NumberingSeries,
  DocumentType,
  Order
} from '@prisma/client';

// --- EXTENDED TYPES WITH RELATIONS ---

export type GlAccountWithDetails = GlAccount & {
  accountType: AccountType;
  businessUnit: Pick<BusinessUnit, 'id' | 'name'>;
  _count: {
    journalLines: number;
  };
};

export type JournalEntryWithDetails = JournalEntry & {
  author: Pick<User, 'id' | 'name'>;
  approver: Pick<User, 'id' | 'name'> | null;
  lines: JournalEntryLineWithAccount[];
  businessUnit: Pick<BusinessUnit, 'id' | 'name'>;
  accountingPeriod: Pick<AccountingPeriod, 'id' | 'name'> | null;
};

export type JournalEntryLineWithAccount = JournalEntryLine & {
  glAccount: GlAccount;
  journalEntry: Pick<JournalEntry, 'id' | 'docNum' | 'postingDate'>;
};

export type ARInvoiceWithDetails = ARInvoice & {
  businessPartner: Pick<BusinessPartner, 'bpCode' | 'name'>;
  businessUnit: Pick<BusinessUnit, 'id' | 'name'>;
  items: ARInvoiceItemWithDetails[];
  journalEntry: JournalEntry | null;
  baseDelivery: { id: string; docNum: string } | null;
  orders: Pick<Order, 'id' | 'totalAmount'>[];
};

export type ARInvoiceItemWithDetails = ARInvoiceItem & {
  menuItem: Pick<MenuItem, 'id' | 'name'> | null;
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
  journalEntries: JournalEntry[];
};

export type AccountingPeriodWithDetails = AccountingPeriod & {
  businessUnit: Pick<BusinessUnit, 'id' | 'name'>;
  _count: {
    journalEntries: number;
  };
};

export type NumberingSeriesWithDetails = NumberingSeries & {
  businessUnit: Pick<BusinessUnit, 'id' | 'name'>;
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
  accountingPeriodId?: string;
  lines: CreateJournalEntryLineData[];
};

export type UpdateJournalEntryData = CreateJournalEntryData & {
  id: string;
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
  arInvoiceIds?: string[];
};

export type CreateOutgoingPaymentData = {
  businessUnitId: string;
  bpCode: string;
  paymentDate: Date;
  amount: number;
  bankAccountId: string;
  apInvoiceIds?: string[];
};

export type CreateDepositData = {
  businessUnitId: string;
  bankAccountId: string;
  depositDate: Date;
  amount: number;
  description?: string;
};

export type CreateAccountingPeriodData = {
  name: string;
  startDate: Date;
  endDate: Date;
  status: PeriodStatus;
  businessUnitId: string;
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
  accountingPeriodId?: string;
};

export type ARInvoiceFilters = FinancialFilters & {
  isPaid?: boolean;
  overdue?: boolean;
};

export type APInvoiceFilters = FinancialFilters & {
  isPaid?: boolean;
  overdue?: boolean;
};

export type BankAccountFilters = {
  businessUnitId: string;
  searchTerm?: string;
  hasBalance?: boolean;
};

export type AccountingPeriodFilters = {
  businessUnitId: string;
  status?: PeriodStatus;
  year?: number;
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

export type AccountingPeriodColumn = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: PeriodStatus;
  journalEntryCount: number;
  createdAt: string;
};

// --- UTILITY TYPES ---

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
  accountNumber: string;
};

export type UserOption = {
  id: string;
  name: string | null;
};

export type MenuItemOption = {
  id: string;
  name: string;
  price: number;
};

export type AccountingPeriodOption = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: PeriodStatus;
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
  cashFlowTrend: { month: string; inflow: number; outflow: number; net: number }[];
  profitMarginTrend: { month: string; margin: number }[];
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

// --- AGING ANALYSIS TYPES ---

export type AgingBucket = {
  period: string;
  amount: number;
  count: number;
  percentage: number;
};

export type AgingAnalysis = {
  buckets: AgingBucket[];
  totalAmount: number;
  totalCount: number;
  averageDaysOutstanding: number;
};

// --- FINANCIAL RATIOS ---

export type FinancialRatios = {
  liquidity: {
    currentRatio: number;
    quickRatio: number;
    cashRatio: number;
  };
  profitability: {
    grossProfitMargin: number;
    netProfitMargin: number;
    returnOnAssets: number;
    returnOnEquity: number;
  };
  efficiency: {
    assetTurnover: number;
    receivablesTurnover: number;
    payablesTurnover: number;
    inventoryTurnover: number;
  };
  leverage: {
    debtToEquity: number;
    debtToAssets: number;
    equityMultiplier: number;
  };
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
  canClose: boolean;
  errors: string[];
  warnings: string[];
};

// --- FINANCIAL CLOSE TYPES ---

export type FinancialCloseChecklist = {
  id: string;
  periodId: string;
  items: FinancialCloseChecklistItem[];
  completedAt?: Date;
  completedBy?: string;
};

export type FinancialCloseChecklistItem = {
  id: string;
  description: string;
  isRequired: boolean;
  isCompleted: boolean;
  completedAt?: Date;
  completedBy?: string;
  notes?: string;
};

// --- RECONCILIATION TYPES ---

export type BankReconciliationItem = {
  id: string;
  date: Date;
  description: string;
  amount: number;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  isReconciled: boolean;
  journalEntryId?: string;
};

export type BankReconciliation = {
  id: string;
  bankAccountId: string;
  periodStart: Date;
  periodEnd: Date;
  openingBalance: number;
  closingBalance: number;
  statementBalance: number;
  adjustments: BankReconciliationItem[];
  isCompleted: boolean;
};

// --- DOCUMENT NUMBERING TYPES ---

export type DocumentNumberingConfig = {
  documentType: DocumentType;
  prefix: string;
  nextNumber: number;
  businessUnitId: string;
};

// --- IMPORT/EXPORT TYPES ---

export type ImportValidationResult = {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  validRows: number;
  totalRows: number;
};

export type ExportConfig = {
  format: 'PDF' | 'EXCEL' | 'CSV';
  includeDetails: boolean;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
};

// --- AUDIT TRAIL TYPES ---

export type FinancialAuditLog = {
  id: string;
  entityType: 'JOURNAL_ENTRY' | 'AR_INVOICE' | 'AP_INVOICE' | 'PAYMENT' | 'GL_ACCOUNT';
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'VOID' | 'POST';
  userId: string;
  userName: string;
  timestamp: Date;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
};

// --- BUDGET & FORECAST TYPES ---

export type BudgetItem = {
  accountCode: string;
  accountName: string;
  budgetedAmount: number;
  actualAmount: number;
  variance: number;
  variancePercentage: number;
};

export type BudgetAnalysis = {
  revenue: BudgetItem[];
  expenses: BudgetItem[];
  totalBudgetedRevenue: number;
  totalActualRevenue: number;
  totalBudgetedExpenses: number;
  totalActualExpenses: number;
  netBudgetedIncome: number;
  netActualIncome: number;
  overallVariance: number;
};

// --- TAX TYPES ---

export type TaxConfiguration = {
  id: string;
  businessUnitId: string;
  taxType: 'VAT' | 'SALES_TAX' | 'WITHHOLDING';
  rate: number;
  glAccountId: string;
  isActive: boolean;
};

export type TaxCalculation = {
  baseAmount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  taxAccountId: string;
};

// --- FINANCIAL REPORT TYPES ---

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

// --- CASH FLOW STATEMENT TYPES ---

export type CashFlowStatement = {
  operating: CashFlowCategory;
  investing: CashFlowCategory;
  financing: CashFlowCategory;
  netCashFlow: number;
  beginningCash: number;
  endingCash: number;
};

export type CashFlowCategory = {
  name: string;
  items: { description: string; amount: number }[];
  total: number;
};

// --- FINANCIAL DASHBOARD WIDGETS ---

export type DashboardWidget = {
  id: string;
  title: string;
  type: 'KPI' | 'CHART' | 'TABLE' | 'GAUGE';
  data: any;
  config: {
    size: 'small' | 'medium' | 'large';
    refreshInterval?: number;
  };
};

export type KPIWidget = {
  title: string;
  value: number;
  previousValue?: number;
  target?: number;
  format: 'currency' | 'percentage' | 'number';
  trend: 'up' | 'down' | 'neutral';
  icon: string;
};

// --- PERIOD CLOSE TYPES ---

export type PeriodCloseValidation = {
  canClose: boolean;
  errors: string[];
  warnings: string[];
  checklist: {
    allJournalEntriesPosted: boolean;
    allInvoicesProcessed: boolean;
    bankReconciliationComplete: boolean;
    inventoryValuationComplete: boolean;
    fixedAssetsRecorded: boolean;
    accrualEntriesPosted: boolean;
  };
};

// --- MULTI-CURRENCY TYPES (for future expansion) ---

export type CurrencyRate = {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  effectiveDate: Date;
  isActive: boolean;
};

export type MultiCurrencyAmount = {
  localAmount: number;
  foreignAmount?: number;
  currencyCode: string;
  exchangeRate?: number;
};

// --- APPROVAL WORKFLOW TYPES ---

export type ApprovalWorkflow = {
  id: string;
  documentType: DocumentType;
  businessUnitId: string;
  steps: ApprovalStep[];
  isActive: boolean;
};

export type ApprovalStep = {
  id: string;
  stepNumber: number;
  approverRoleId: string;
  isRequired: boolean;
  minimumAmount?: number;
  maximumAmount?: number;
};

export type DocumentApproval = {
  id: string;
  documentId: string;
  documentType: DocumentType;
  stepNumber: number;
  approverId: string;
  approvedAt: Date;
  comments?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
};