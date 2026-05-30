// Seed assumptions extracted/derived from "Budget demo energi version 1.xlsx".
// Year horizon shifted to 2026–2030.

import type { Assumptions, YearAssumptions, ChannelKey } from "./types";

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
export const SEED_ASSUMPTIONS: Assumptions = {
  startYear: 2026,
  years: 5,
  vatRate: 0.25,
  salesAppreciationPct: 0,
  perYear: [
    yearAssumptions(1.0, 1200),
    yearAssumptions(1.1, 0), // engine will use computed end-of-prior-year
    yearAssumptions(1.15, 0),
    yearAssumptions(1.15, 0),
    yearAssumptions(1.1, 0),
  ],
};
