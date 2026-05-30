# Budget Tool — Next Iteration

Two additive feature blocks on top of the existing budget model. No breaking changes to current scenarios; defaults keep today's numbers unchanged.

---

## A. Results / Actuals tab

New "Results" view where the user enters actual monthly numbers and sees variance vs budget.

### Data
`src/lib/budget/types.ts` — additive:
```ts
export interface ActualMonth {
  year: number; month: number;
  customers?: number;
  totalIncome?: number;
  totalCost?: number;
  volumeByArea?: Partial<Record<PriceAreaKey, number>>;
}
export interface Actuals { rows: ActualMonth[] }
```
`Scenario` gains `actuals: Actuals`. `seed.ts` seeds `{ rows: [] }`. `store.ts` adds `setActual(year, month, patch)` and `clearActuals(year?)`.

### Engine
`engine.ts` gets a pure helper `buildResults(model, actuals, year)` that joins budget vs actuals per month and returns variance + YTD totals. `compute()` is untouched.

### UI
`src/routes/_app/results.tsx` + nav link in `Topbar`:
- KPI strip: Actual YTD income, Δ% vs budget, Actual EBITDA, latest reported customers.
- Editable 12-row table (Month | Cust | Income | Cost | EBITDA | Δ Income | Δ Cost | Δ EBITDA). Empty cells = "—". Negative deltas use `num-neg`.
- Buttons: "Clear year", "Copy budget → actuals" (prefill).
- Optional collapsible: per-area actual volume.

Styling identical to existing tabs (rounded-sm border-border bg-card, serif headings, tabular-nums).

---

## B. Time-phased plans: hires, contracts, sales ramp & appreciation

Today everything is annualized. Add **start dates** so costs/revenues only count from a specific month, plus a yearly **appreciation %** that compounds sales over the horizon.

### B1. Employee start dates
`SalaryRole` gains:
```ts
startYear?: number;   // first year the role exists (default: scenario start)
startMonth?: number;  // 1..12, default 1
endYear?: number;     // optional, role ends
endMonth?: number;
```
Engine: salary line iterates monthly; a role contributes only when `(year, month) >= start` and `<= end`. Replaces the current `salaryMonth = salaryYear / 12` with a month-aware sum. Social fees applied as today.

UI (`budget.tsx` Salaries tab): two compact `YYYY-MM` selects per row (Start / End). Defaults blank = always active.

### B2. Customer-acquisition / contracts start date
`YearAssumptions` gains:
```ts
salesStartMonth?: number; // 1..12 — first month new customers are acquired this year
```
Engine: months before `salesStartMonth` get `newPerMonth = 0` (and zero sales cost). Months on/after split the year's `newCustomersByChannel` total evenly across the remaining months so the annual channel mix stays meaningful.

UI: single month select in the "Customers & Churn" panel header, labeled "Sales start".

### B3. Sales appreciation (price escalation)
`Assumptions` gains:
```ts
salesAppreciationPct: number; // yearly % uplift applied to pricePerKwh, subscription, extra services, and per-area pslagOre. Default 0.
```
Engine: for year index `i`, multiplier = `(1 + salesAppreciationPct) ** i`. Applied to:
- `pricePerKwh` and per-area `avgPurchaseOre + pslagOre` sell side (cost side untouched — represents margin uplift)
- `subscriptionPerCustomerYear`
- `extraServicesPerCustomerYear`

Toggle in `Topbar` global controls: numeric input "Sales appreciation %/yr" next to year selector. Stored on the active scenario.

### B4. Contract anchor date (display only)
`Scenario` gains `contractStartDate?: string` (ISO `YYYY-MM-DD`). Shown in Topbar and used as label only — no engine effect, but lets the user pin "model starts from this contract".

---

## Files touched

- `src/lib/budget/types.ts` — `ActualMonth`, `Actuals`, role start/end, `salesStartMonth`, `salesAppreciationPct`, `contractStartDate`
- `src/lib/budget/seed.ts` — defaults (all opt-in, zero appreciation, no start-month gating)
- `src/lib/budget/engine.ts` — month-aware salaries, sales-start gating, appreciation multiplier, `buildResults` helper
- `src/lib/budget/store.ts` — actuals + appreciation mutations
- `src/routes/_app/results.tsx` — new tab
- `src/routes/_app/budget.tsx` — role date pickers, sales-start select, appreciation input integration
- `src/components/budget/Topbar.tsx` — Results link, appreciation input, contract date

## Out of scope
- CSV import for actuals
- Per-channel start dates (only one sales-start month per year)
- Different appreciation per revenue stream (single global %)
- Cross-project live fetch from Energy system
