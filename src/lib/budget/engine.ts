// Pure budget computation engine.
// Takes Assumptions, returns monthly + yearly aggregates.

import type {
  Assumptions,
  ComputedModel,
  MonthlyRow,
  PriceAreaKey,
  YearAssumptions,
  YearlyRow,
  ChannelKey,
} from "./types";

const PRICE_AREAS: PriceAreaKey[] = ["SE1", "SE2", "SE3", "SE4"];

function sumChannels(by: Record<ChannelKey, number>): number {
  return Object.values(by).reduce((a, b) => a + b, 0);
}

function yearlySalaryCost(y: YearAssumptions): number {
  const monthly = y.salaries.reduce(
    (acc, r) => acc + r.count * r.monthlySalary,
    0,
  );
  return monthly * 12 * (1 + y.socialFeesPct);
}

export function compute(a: Assumptions): ComputedModel {
  const monthly: MonthlyRow[] = [];
  const yearly: YearlyRow[] = [];

  let runningStart = a.perYear[0].startingCustomers;

  for (let y = 0; y < a.years; y++) {
    const ya = a.perYear[y];
    const yearStartCustomers = y === 0 ? ya.startingCustomers : runningStart;

    const newCustomersYear = sumChannels(ya.newCustomersByChannel);
    const newPerMonth = newCustomersYear / 12;
    const monthlyChurnRate = 1 - Math.pow(1 - ya.churnRate, 1 / 12);

    const salaryYear = yearlySalaryCost(ya);
    const otherExtMonth = ya.otherExternalExpenses / 12;
    const salaryMonth = salaryYear / 12;
    const loanMonth = ya.loanInterest / 12;
    const salesCostYear = newCustomersYear * ya.acquisitionCostPerCustomer;
    const salesMonth = salesCostYear / 12;

    let active = yearStartCustomers;
    let yearAgg: YearlyRow = {
      year: a.startYear + y,
      startingCustomers: yearStartCustomers,
      endingCustomers: 0,
      newCustomers: 0,
      churnedCustomers: 0,
      totalIncome: 0,
      totalCost: 0,
      ebitda: 0,
      cashFlow: 0,
      cac: ya.acquisitionCostPerCustomer,
      churnRate: ya.churnRate,
      electricityIncome: 0,
      certificateIncome: 0,
      extraServicesIncome: 0,
      subscriptionIncome: 0,
      electricityCost: 0,
      certificateCost: 0,
      salesCost: 0,
      salaryCost: 0,
      otherExternal: 0,
      invoicingCost: 0,
      loanInterest: 0,
      volumeByArea: { SE1: 0, SE2: 0, SE3: 0, SE4: 0 },
      revenueByArea: { SE1: 0, SE2: 0, SE3: 0, SE4: 0 },
      cogsByArea: { SE1: 0, SE2: 0, SE3: 0, SE4: 0 },
    };

    for (let m = 1; m <= 12; m++) {
      const startCust = active;
      const newCust = newPerMonth;
      const churned = (startCust + newCust / 2) * monthlyChurnRate;
      const endCust = startCust + newCust - churned;
      const avgCust = (startCust + endCust) / 2;

      const kwhMonth = (avgCust * ya.kwhPerCustomerYear) / 12;

      const useArea = !!(ya.useAreaPricing && ya.priceAreaPricing);
      let electricityIncome = 0;
      let certificateIncome = 0;
      let electricityCost = 0;
      let certificateCost = 0;
      const monthRevenueByArea: Record<PriceAreaKey, number> = { SE1: 0, SE2: 0, SE3: 0, SE4: 0 };
      const monthCogsByArea: Record<PriceAreaKey, number> = { SE1: 0, SE2: 0, SE3: 0, SE4: 0 };

      if (useArea) {
        for (const k of PRICE_AREAS) {
          const p = ya.priceAreaPricing![k];
          const kwhArea = kwhMonth * ya.priceAreaShare[k];
          const sellSEK = (p.avgPurchaseOre + p.pslagOre) / 100;
          const costSEK = p.avgPurchaseOre / 100;
          const certSEK = p.elcertOre / 100;
          const eIncA = kwhArea * sellSEK * (1 + ya.surchargePct);
          const cIncA = kwhArea * certSEK;
          const eCostA = kwhArea * costSEK;
          const cCostA = kwhArea * certSEK;
          electricityIncome += eIncA;
          certificateIncome += cIncA;
          electricityCost += eCostA;
          certificateCost += cCostA;
          monthRevenueByArea[k] = eIncA + cIncA;
          monthCogsByArea[k] = eCostA + cCostA;
        }
      } else {
        electricityIncome = kwhMonth * ya.pricePerKwh * (1 + ya.surchargePct);
        certificateIncome = kwhMonth * ya.certificateCostPerKwh;
        electricityCost = kwhMonth * ya.costPerKwh;
        certificateCost = kwhMonth * ya.certificateCostPerKwh;
      }

      const extraServicesIncome =
        (avgCust * ya.extraServicesPerCustomerYear) / 12;
      const subscriptionIncome =
        (avgCust * ya.subscriptionPerCustomerYear) / 12;
      const totalIncome =
        electricityIncome +
        certificateIncome +
        extraServicesIncome +
        subscriptionIncome;

      const invoicingCost = (avgCust * ya.invoicingCostPerCustomer) / 12;

      const totalCost =
        electricityCost +
        certificateCost +
        invoicingCost +
        salesMonth +
        salaryMonth +
        otherExtMonth +
        loanMonth;

      const ebitda = totalIncome - totalCost + loanMonth; // EBITDA before interest
      const cashFlow = totalIncome - totalCost;

      const vatOut = totalIncome * a.vatRate;
      const vatIn =
        (electricityCost +
          certificateCost +
          invoicingCost +
          otherExtMonth +
          salesMonth) *
        a.vatRate;

      const row: MonthlyRow = {
        year: a.startYear + y,
        month: m,
        startingCustomers: Math.round(startCust),
        newCustomers: Math.round(newCust),
        churnedCustomers: Math.round(churned),
        endingCustomers: Math.round(endCust),
        electricityIncome,
        certificateIncome,
        extraServicesIncome,
        subscriptionIncome,
        totalIncome,
        electricityCost,
        certificateCost,
        invoicingCost,
        salesCost: salesMonth,
        salaryCost: salaryMonth,
        otherExternal: otherExtMonth,
        loanInterest: loanMonth,
        totalCost,
        ebitda,
        cashFlow,
        vatOut,
        vatIn,
        vatNet: vatOut - vatIn,
      };
      monthly.push(row);

      // Aggregate
      yearAgg.newCustomers += newCust;
      yearAgg.churnedCustomers += churned;
      yearAgg.totalIncome += totalIncome;
      yearAgg.totalCost += totalCost;
      yearAgg.ebitda += ebitda;
      yearAgg.cashFlow += cashFlow;
      yearAgg.electricityIncome += electricityIncome;
      yearAgg.certificateIncome += certificateIncome;
      yearAgg.extraServicesIncome += extraServicesIncome;
      yearAgg.subscriptionIncome += subscriptionIncome;
      yearAgg.electricityCost += electricityCost;
      yearAgg.certificateCost += certificateCost;
      yearAgg.salesCost += salesMonth;
      yearAgg.salaryCost += salaryMonth;
      yearAgg.otherExternal += otherExtMonth;
      yearAgg.invoicingCost += invoicingCost;
      yearAgg.loanInterest += loanMonth;

      for (const k of PRICE_AREAS) {
        yearAgg.volumeByArea[k] += kwhMonth * ya.priceAreaShare[k];
        yearAgg.revenueByArea[k] += monthRevenueByArea[k];
        yearAgg.cogsByArea[k] += monthCogsByArea[k];
      }

      active = endCust;
    }

    yearAgg.endingCustomers = Math.round(active);
    yearAgg.newCustomers = Math.round(yearAgg.newCustomers);
    yearAgg.churnedCustomers = Math.round(yearAgg.churnedCustomers);
    yearly.push(yearAgg);
    runningStart = active;
  }

  return { monthly, yearly };
}

export function kpiForYear(model: ComputedModel, year: number) {
  const y = model.yearly.find((r) => r.year === year) ?? model.yearly[0];
  return {
    customers: y.endingCustomers,
    turnover: y.totalIncome,
    ebitda: y.ebitda,
    cashFlow: y.cashFlow,
    cac: y.cac,
    churn: y.churnRate,
  };
}
