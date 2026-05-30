// Domain types for the Nordic retail energy budget model.

export type ChannelKey =
  | "internet"
  | "telephone"
  | "print"
  | "collaborations"
  | "tellAFriend"
  | "fairs"
  | "other";

export const CHANNELS: { key: ChannelKey; label: string }[] = [
  { key: "internet", label: "Internet" },
  { key: "telephone", label: "Telephone" },
  { key: "print", label: "Print" },
  { key: "collaborations", label: "Collaborations" },
  { key: "tellAFriend", label: "Tell a friend" },
  { key: "fairs", label: "Fairs" },
  { key: "other", label: "Other" },
];

export type StreamKey = "solar" | "battery" | "vpp" | "saas";

export const STREAMS: { key: StreamKey; label: string; unitLabel: string }[] = [
  { key: "solar", label: "Solar installations", unitLabel: "systems" },
  { key: "battery", label: "Battery storage", unitLabel: "systems" },
  { key: "vpp", label: "VPP enrollment", unitLabel: "assets" },
  { key: "saas", label: "Energy SaaS", unitLabel: "subscribers" },
];

export interface StreamAssumptions {
  enabled: boolean;
  /** New units sold/onboarded per year. */
  newUnitsPerYear: number;
  /** One-time revenue recognised per unit at sale (e.g. solar install). */
  oneTimeRevenuePerUnit: number;
  /** Cost-of-goods on one-time revenue, as a fraction (0..1). */
  oneTimeCogsPct: number;
  /** Recurring monthly revenue per active unit (O&M, SaaS, VPP fee). */
  recurringMonthlyPerUnit: number;
  /** Cost-of-goods on recurring revenue, as a fraction (0..1). */
  recurringCogsPct: number;
  /** Annual churn rate on active units (0..1). */
  annualChurnPct: number;
  /** Starting active units at scenario start (year 0 only). */
  startingUnits?: number;
}

export type PriceAreaKey = "SE1" | "SE2" | "SE3" | "SE4";

export interface AreaPricing {
  /** öre/kWh — Energy system: avg_purchase_price_per_mwh / 10 */
  avgPurchaseOre: number;
  /** öre/kWh — Energy system: pslag_per_mwh / 10 */
  pslagOre: number;
  /** öre/kWh — Energy system: elcert_per_mwh / 10 */
  elcertOre: number;
}

export interface SalaryRole {
  title: string;
  count: number;
  monthlySalary: number; // SEK / month / person
  /** First active year (e.g. 2026). Undefined = active from scenario start. */
  startYear?: number;
  /** First active month 1..12. Defaults to 1. */
  startMonth?: number;
  /** Last active year. Undefined = never ends. */
  endYear?: number;
  /** Last active month 1..12. Defaults to 12. */
  endMonth?: number;
}

export interface YearAssumptions {
  /** New customers per year by channel */
  newCustomersByChannel: Record<ChannelKey, number>;
  /** Annual churn rate (0..1) */
  churnRate: number;
  /** Acquisition cost SEK per acquired customer (sales costs scale on new customers) */
  acquisitionCostPerCustomer: number;
  /** Average yearly consumption kWh per customer */
  kwhPerCustomerYear: number;
  /** Yearly subscription fee SEK per customer */
  subscriptionPerCustomerYear: number;
  /** Average sales price per kWh (SEK) */
  pricePerKwh: number;
  /** Direct purchase cost per kWh (SEK) */
  costPerKwh: number;
  /** Electricity certificate cost per kWh (SEK) */
  certificateCostPerKwh: number;
  /** Surcharge % on energy price (0..1) */
  surchargePct: number;
  /** Profit on extra services SEK per customer per year */
  extraServicesPerCustomerYear: number;
  /** Other external expenses SEK per year (rent, marketing, IT…) */
  otherExternalExpenses: number;
  /** Social fees on salaries (0..1) */
  socialFeesPct: number;
  /** Loan interest paid SEK per year */
  loanInterest: number;
  /** Invoicing cost SEK per customer per year */
  invoicingCostPerCustomer: number;
  /** Salary roster */
  salaries: SalaryRole[];
  /** Price area volume share (must sum to 1) */
  priceAreaShare: Record<PriceAreaKey, number>;
  /** Starting active customers at year start */
  startingCustomers: number;
  /** Optional per-area pricing override (öre/kWh). Synced from Energy system. */
  priceAreaPricing?: Record<PriceAreaKey, AreaPricing>;
  /** When true and priceAreaPricing is set, engine uses per-area pricing instead of global pricePerKwh/costPerKwh/certificateCostPerKwh. */
  useAreaPricing?: boolean;
  /** First month (1..12) within this year that new customers are acquired. Defaults to 1. */
  salesStartMonth?: number;
  /** Optional new revenue streams (solar / battery / VPP / SaaS). */
  streams?: Record<StreamKey, StreamAssumptions>;
}

export interface OpeningBalance {
  cash: number;
  accountsReceivable: number;
  accountsPayable: number;
  fixedAssets: number;
  debt: number;
  equity: number;
}

export interface Assumptions {
  /** First year (e.g. 2026) */
  startYear: number;
  /** Number of forecast years (default 10) */
  years: number;
  /** Per-year overrides (year offset 0..years-1) */
  perYear: YearAssumptions[];
  /** VAT rate (0..1) */
  vatRate: number;
  /** Yearly sales appreciation rate (0..1). Applied to sell-side prices, subscriptions, extra services. */
  salesAppreciationPct?: number;
  /** Corporate income tax rate (0..1) applied to positive EBT. */
  taxRate?: number;
  /** Useful life of capitalized fixed assets (years) — straight-line D&A. */
  depreciationYears?: number;
  /** Days Sales Outstanding — drives accounts receivable. */
  dso?: number;
  /** Days Payable Outstanding — drives accounts payable. */
  dpo?: number;
  /** Opening balance sheet (period 0). */
  opening?: OpeningBalance;
}

/** Period in P&L / Cash Flow / Balance Sheet output. */
export interface PnLRow {
  year: number;
  month: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  opex: number;          // salaries + other external + invoicing + sales
  ebitda: number;
  depreciation: number;
  ebit: number;
  interest: number;
  ebt: number;
  tax: number;
  netIncome: number;
}

export interface CashFlowRow {
  year: number;
  month: number;
  netIncome: number;
  depreciation: number;
  changeAR: number;
  changeAP: number;
  cfo: number;            // operating cash flow
  capex: number;
  cfi: number;            // investing
  debtChange: number;
  cff: number;            // financing
  netChange: number;
  endingCash: number;
}

export interface BalanceSheetRow {
  year: number;
  month: number;
  cash: number;
  accountsReceivable: number;
  fixedAssets: number;
  totalAssets: number;
  accountsPayable: number;
  debt: number;
  totalLiabilities: number;
  equity: number;
  totalLiabEquity: number;
  check: number;          // assets − (L + E); should be ~0
}

export interface Statements {
  pnl: PnLRow[];
  cashFlow: CashFlowRow[];
  balanceSheet: BalanceSheetRow[];
}

export interface MonthlyRow {
  year: number;
  month: number; // 1..12
  startingCustomers: number;
  newCustomers: number;
  churnedCustomers: number;
  endingCustomers: number;
  // Income
  electricityIncome: number;
  certificateIncome: number;
  extraServicesIncome: number;
  subscriptionIncome: number;
  totalIncome: number;
  // Costs
  electricityCost: number;
  certificateCost: number;
  invoicingCost: number;
  salesCost: number;
  salaryCost: number; // incl social fees
  otherExternal: number;
  loanInterest: number;
  totalCost: number;
  // Results
  ebitda: number;
  cashFlow: number;
  vatOut: number;
  vatIn: number;
  vatNet: number;
}

export interface YearlyRow {
  year: number;
  startingCustomers: number;
  endingCustomers: number;
  newCustomers: number;
  churnedCustomers: number;
  totalIncome: number;
  totalCost: number;
  ebitda: number;
  cashFlow: number;
  cac: number;
  churnRate: number;
  electricityIncome: number;
  certificateIncome: number;
  extraServicesIncome: number;
  subscriptionIncome: number;
  electricityCost: number;
  certificateCost: number;
  salesCost: number;
  salaryCost: number;
  otherExternal: number;
  invoicingCost: number;
  loanInterest: number;
  /** Volume per price area (kWh) */
  volumeByArea: Record<PriceAreaKey, number>;
  /** Revenue per price area (SEK) — populated when useAreaPricing=true */
  revenueByArea: Record<PriceAreaKey, number>;
  /** Cost-of-goods per price area (SEK) — populated when useAreaPricing=true */
  cogsByArea: Record<PriceAreaKey, number>;
}

export interface ComputedModel {
  monthly: MonthlyRow[];
  yearly: YearlyRow[];
}

export type ScenarioName = "Base" | "Optimistic" | "Pessimistic";

export interface Scenario {
  id: string;
  name: string;
  createdAt: number;
  assumptions: Assumptions;
  /** Actual reported monthly numbers. */
  actuals?: Actuals;
  /** Optional contract anchor date (ISO YYYY-MM-DD). Display only. */
  contractStartDate?: string;
}

export interface ActualMonth {
  year: number;
  month: number; // 1..12
  customers?: number;
  totalIncome?: number;
  totalCost?: number;
  volumeByArea?: Partial<Record<PriceAreaKey, number>>;
}

export interface Actuals {
  rows: ActualMonth[];
}

