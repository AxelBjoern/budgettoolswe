// Seed assumptions extracted/derived from "Budget demo energi version 1.xlsx".
// Year horizon shifted to 2026–2030.

import type { Assumptions, YearAssumptions, ChannelKey, StreamKey, StreamAssumptions } from "./types";

function zeroStream(): StreamAssumptions {
  return {
    enabled: false,
    newUnitsPerYear: 0,
    oneTimeRevenuePerUnit: 0,
    oneTimeCogsPct: 0,
    recurringMonthlyPerUnit: 0,
    recurringCogsPct: 0,
    annualChurnPct: 0,
    startingUnits: 0,
  };
}

function zeroStreams(): Record<StreamKey, StreamAssumptions> {
  return {
    solar: zeroStream(),
    battery: zeroStream(),
    vpp: zeroStream(),
    saas: zeroStream(),
  };
}

const baseChannels = (scale: number): Record<ChannelKey, number> => ({
  internet: Math.round(2400 * scale),
  telephone: Math.round(1800 * scale),
  print: Math.round(600 * scale),
  collaborations: Math.round(900 * scale),
  tellAFriend: Math.round(500 * scale),
  fairs: Math.round(300 * scale),
  other: Math.round(200 * scale),
});

const baseSalaries = () => [
  { title: "VD", count: 1, monthlySalary: 95000 },
  { title: "vVD", count: 1, monthlySalary: 75000 },
  { title: "CFO", count: 1, monthlySalary: 70000 },
  { title: "IT", count: 3, monthlySalary: 55000 },
  { title: "Law", count: 2, monthlySalary: 60000 },
  { title: "Sales Manager", count: 1, monthlySalary: 65000 },
  { title: "Sales", count: 20, monthlySalary: 38000 },
  { title: "Customer service", count: 5, monthlySalary: 32000 },
  { title: "Quality", count: 4, monthlySalary: 42000 },
];

function yearAssumptions(scale: number, starting: number): YearAssumptions {
  return {
    newCustomersByChannel: baseChannels(scale),
    churnRate: 0.12,
    acquisitionCostPerCustomer: 450,
    kwhPerCustomerYear: 15000,
    subscriptionPerCustomerYear: 480,
    pricePerKwh: 1.45,
    costPerKwh: 0.95,
    certificateCostPerKwh: 0.045,
    surchargePct: 0.04,
    extraServicesPerCustomerYear: 120,
    otherExternalExpenses: 4_200_000,
    socialFeesPct: 0.3142,
    loanInterest: 350_000,
    invoicingCostPerCustomer: 24,
    salaries: baseSalaries(),
    priceAreaShare: { SE1: 0.12, SE2: 0.18, SE3: 0.52, SE4: 0.18 },
    startingCustomers: starting,
    priceAreaPricing: {
      SE1: { avgPurchaseOre: 28, pslagOre: 8, elcertOre: 4.5 },
      SE2: { avgPurchaseOre: 32, pslagOre: 8, elcertOre: 4.5 },
      SE3: { avgPurchaseOre: 58, pslagOre: 10, elcertOre: 4.5 },
      SE4: { avgPurchaseOre: 78, pslagOre: 12, elcertOre: 4.5 },
    },
    useAreaPricing: false,
  };
}

// Customer ramp: ~6,700 new/yr, 12% churn → climbing book of business.
// Starting customer count grows year over year as the engine actually computes,
// but we still seed an initial value for year 0.
const zeroChannels = (): Record<ChannelKey, number> => ({
  internet: 0,
  telephone: 0,
  print: 0,
  collaborations: 0,
  tellAFriend: 0,
  fairs: 0,
  other: 0,
});

function zeroYear(): YearAssumptions {
  return {
    newCustomersByChannel: zeroChannels(),
    churnRate: 0,
    acquisitionCostPerCustomer: 0,
    kwhPerCustomerYear: 0,
    subscriptionPerCustomerYear: 0,
    pricePerKwh: 0,
    costPerKwh: 0,
    certificateCostPerKwh: 0,
    surchargePct: 0,
    extraServicesPerCustomerYear: 0,
    otherExternalExpenses: 0,
    socialFeesPct: 0.3142,
    loanInterest: 0,
    invoicingCostPerCustomer: 0,
    salaries: [],
    priceAreaShare: { SE1: 0.25, SE2: 0.25, SE3: 0.25, SE4: 0.25 },
    startingCustomers: 0,
    priceAreaPricing: {
      SE1: { avgPurchaseOre: 0, pslagOre: 0, elcertOre: 0 },
      SE2: { avgPurchaseOre: 0, pslagOre: 0, elcertOre: 0 },
      SE3: { avgPurchaseOre: 0, pslagOre: 0, elcertOre: 0 },
      SE4: { avgPurchaseOre: 0, pslagOre: 0, elcertOre: 0 },
    },
    useAreaPricing: false,
    streams: zeroStreams(),
  };
}

void yearAssumptions;
void baseSalaries;

const HORIZON_YEARS = 10;

export const SEED_ASSUMPTIONS: Assumptions = {
  startYear: 2026,
  years: HORIZON_YEARS,
  vatRate: 0.25,
  salesAppreciationPct: 0,
  taxRate: 0.206,
  depreciationYears: 5,
  dso: 30,
  dpo: 30,
  opening: {
    cash: 0,
    accountsReceivable: 0,
    accountsPayable: 0,
    fixedAssets: 0,
    debt: 0,
    equity: 0,
  },
  financing: {
    enabled: false,
    originationsPerYear: Array.from({ length: HORIZON_YEARS }, () => 0),
    avgPrincipal: 0,
    termMonths: 120,
    customerAPR: 0,
    originationFeePct: 0,
    costOfCapitalPct: 0,
    defaultAnnualPct: 0,
    recoveryPct: 0,
    openingOutstanding: 0,
  },
  perYear: Array.from({ length: HORIZON_YEARS }, () => zeroYear()),
};
