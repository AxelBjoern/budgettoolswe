
# Nordenergi Budget — Enterprise Phase 1

Transform the existing electricity-retail budget into a full enterprise planning platform. Scope per your answers: full P&L + CF + BS, new revenue streams (solar/battery/financing/VPP/SaaS), financing portfolio module, scenario engine with exports, 10-year horizon. Auth/roles/audit deferred. VDNX skipped.

Work is grouped into 5 sequential modules so each lands shippable. I'd recommend confirming Module 1 before I start, then approve each subsequent module as it's built.

---

## Module 1 — Foundation: 10-year horizon + financial statements

**Data model (`src/lib/budget/types.ts`)**
- Bump default `years` to 10. Add helper to generate `perYear[]` of length 10.
- New types: `PnLRow`, `CashFlowRow`, `BalanceSheetRow`, `Statements { pnl, cashFlow, balanceSheet }`.
- Add `Assumptions.opening` (opening balance sheet: cash, AR, AP, equity, debt, fixed assets).
- Add `Assumptions.taxRate`, `depreciationYears`.

**Engine (`src/lib/budget/engine.ts`)**
- Extend `compute()` to derive monthly P&L (gross margin → EBITDA → D&A → EBIT → interest → tax → net income).
- New `buildStatements(model, assumptions)`: indirect cash flow (NI + D&A ± WC Δ ± financing ± capex) and rolling balance sheet (assets = liabilities + equity check enforced).
- Working capital drivers: DSO, DPO, inventory days as new assumption fields.

**UI**
- New route `src/routes/_app/statements.tsx` — three sub-tabs (P&L / Cash Flow / Balance Sheet), monthly + annual toggle, year selector.
- Topbar nav link "Statements".
- Reuse existing card/tabular styling.

**Store**
- Store version bump → `v4-statements`.
- Migration: pad existing 5-year `perYear` to 10 by repeating last year's zero values.

---

## Module 2 — Revenue streams

Add as independent revenue modules so each can be turned on/off per scenario.

**New types** in `Assumptions.revenueStreams`:
- `solar`: `{ systemsPerYear, avgSystemSizeKw, pricePerKw, costPerKw, installLeadMonths }`
- `battery`: `{ unitsPerYear, avgKwh, pricePerKwh, costPerKwh }`
- `vpp`: `{ enrolledShare, revenuePerKwYear }` — derived off installed solar+battery base
- `saas`: `{ feePerCustomerMonth, attachRate }` — derived off retail customer base
- Existing electricity retail stays as-is.

**Engine**
- Each stream produces its own monthly income + COGS line.
- Aggregated into existing `MonthlyRow` via new fields: `solarRevenue/Cost`, `batteryRevenue/Cost`, `vppRevenue`, `saasRevenue`.

**UI**
- New tab in `budget.tsx`: "Revenue streams" with collapsible panel per stream.
- Statements show stream-attributed revenue rows.

---

## Module 3 — Financing portfolio

Customer financing (loans/leases) is its own time-series engine — originations roll into a portfolio with amortization.

**Types** `Assumptions.financing`:
- `originationsPerYear[]` (count, avg ticket, term months, APR, default rate, recovery rate)
- `costOfCapitalPct` (your funding cost)
- `originationChannelMix` (optional, for CAC attribution)

**New module `src/lib/budget/financing.ts`**
- `buildPortfolio(financing, horizon)`: emits per-month cohorts, scheduled principal + interest cash flow, outstanding balance, expected losses, cumulative IRR per cohort.
- Aggregates feed back into main engine: interest income → P&L revenue; principal funded → cash outflow at origination; repayments → cash inflow; net spread = (APR − cost of capital − loss rate).

**UI** `src/routes/_app/financing.tsx`
- Cohort table (vintage / originated / outstanding / IRR / loss).
- Portfolio balance chart over 10 years.
- Funding requirements summary (net cash need from financing activity).

---

## Module 4 — Scenario engine + sensitivity

**Store**
- Existing scenarios already exist. Add `compareScenarios: string[]` for side-by-side view.
- Add `lock: boolean` per scenario (read-only flag, no auth yet).

**New `src/routes/_app/compare.tsx`**
- Pick 2–4 scenarios → side-by-side annual P&L + KPIs + 10y EBITDA chart.
- Variance vs Base column.

**New `src/routes/_app/sensitivity.tsx`**
- Tornado chart: pick a target metric (NPV / 10y EBITDA / cumulative cash) and ±X% sweep over key drivers (price/kWh, churn, CAC, origination volume, cost of capital).
- Pure recompute — no extra dependency.

**Driver attribution**
- Add `key-drivers` panel on dashboard: top 5 inputs by metric elasticity.

---

## Module 5 — Board pack + exports

**Exports** — all client-side, no backend:
- **Excel (.xlsx)** via `exceljs` (bun add): one workbook with sheets — Assumptions, P&L, Cash Flow, Balance Sheet, Financing Portfolio, Scenario Compare. Blue for inputs, black formulas style.
- **PDF** via `jspdf` + `jspdf-autotable`: 1-page exec summary + appendix tables.
- **PowerPoint (.pptx)** via `pptxgenjs`: 8–10 slide board pack (title, KPIs, P&L trend, cash bridge, financing portfolio, scenario compare, sensitivity tornado, capital plan).

**New route `src/routes/_app/board-pack.tsx`**
- Select year range, scenario(s), sections to include → "Generate Excel / PDF / PPTX" buttons.
- Preview pane shows the exec summary view.

---

## Technical notes

- Pure functions throughout (`engine.ts`, `financing.ts`, `statements.ts`); UI consumes computed model.
- All state in Zustand store with localStorage persistence; bump version per breaking schema change with a defensive migration that pads/zero-fills missing fields.
- 10y × 12 months × N scenarios = ~1.2k rows per scenario per stream. Memoize `compute()` per scenario via `useMemo` keyed by assumptions hash.
- No new backend / Lovable Cloud. Everything client-side.
- Design language stays: serif headings, `tabular-nums`, `rounded-sm border border-border bg-card`, `ink-shadow`. New charts via existing Recharts (already in shadcn `chart.tsx`).

---

## Out of scope (deferred per your answers)

- Auth, roles, approval workflow, audit trail
- VDNX integration
- Live ops / asset monitoring
- Real-time data feeds

---

## Suggested sequence

Approve Module 1 first → I build it → verify → approve next. Each module ~self-contained so you can pause/redirect anytime. Want me to start with Module 1 as scoped, or adjust before kicking off?
