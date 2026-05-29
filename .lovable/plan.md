
## Goal
Turn `Budget demo energi version 1.xlsx` into a web app with two surfaces:
1. **Dashboard** — read-only KPIs and charts driven by the model
2. **Budget tool** — editable assumptions that recompute live

Source workbook models a Nordic retail energy company. Key sheets: `Prognos` (5-yr engine), `Start budget`, `Januari` (monthly P&L template), `Prisättning (se)` (price areas SE1–SE4), `Fakturor`.

**Planning horizon: 2026–2030** (originally 2025–2029 in the file — we re-anchor to the current year and forward-shift all seed values by one year).

## Visual direction — VDNX design system

Institutional, paper-and-ink financial aesthetic. Closer to a Bloomberg terminal / governance dashboard than a generic SaaS app.

**Tokens** (`src/styles.css`, written as `oklch` but mapped from these HSL refs):
- `--background` warm paper `hsl(38 30% 96%)` · `--foreground` deep navy `hsl(213 52% 18%)`
- `--card` `hsl(38 30% 97%)` · `--muted` `hsl(38 22% 93%)`
- `--primary` VDNX Navy `#1E3A5F` (`hsl(213 52% 24%)`)
- `--accent` VDNX Gold `#C9A962` (`hsl(42 49% 59%)`) with black foreground
- `--success` `hsl(142 71% 45%)` · `--destructive` for negatives / variance
- `--border` hairline `hsl(213 20% 86%)` · `--radius` `0.5rem`
- Status pills: compliant/warning/critical in blue tints (re-used for variance vs budget)
- Dark mode: near-black bg, gold becomes primary

**Type & chrome:**
- Sans body with OpenType `"rlig","calt","ss01","ss02"`
- Bold headings with `text-shadow: 0 1px 2px rgba(0,0,0,.1)` — subtle ink depth
- 1px navy-tinted hairlines, no soft shadows
- Density toggle `data-density="compact" | "comfortable"` driving `--ui-density`; financial tables default to compact
- Subtle `fade-in` on first render only; respect reduced-motion

**Component patterns:**
- KPI cards: paper surface, navy heading, gold underline under the headline figure
- Tables: hairline rules, tabular-nums, right-aligned, parentheses for negatives
- Charts: navy = budget, gold = scenario/actual, muted = prior year

## Scope

### Editable assumptions (Budget tool)
- New customers per year by channel (Internet, Telephone, Print, Collaborations, Tell-a-friend, Fairs, Other)
- Churn %, acquisition cost per customer
- Avg consumption (kWh/customer/yr), subscription (SEK/yr)
- Avg cost per kWh, certificate cost, surcharges %
- Extra services profit/customer, CO₂ capture, loan & interest, invoicing costs
- Salary roster (VD, vVD, CFO, IT×3, Law×2, Sales Manager, Sales×20, Customer service×5, Quality×4) + social fees
- Other external expenses (rent, accounting, travel, marketing, IT, insurance…)
- Price areas SE1–SE4 (volume share, påslag) — v1 uses weighted average

### Computed outputs
Active customers (start + new − churn) monthly + accumulated · Income (electricity, certificate, extra services, subscription) → Net + VAT · Direct costs · Sales costs per channel · OpEx · Salaries incl. social · EBITDA / Result / Cash flow (monthly + accumulated) · VAT in/out · VAT report.

### Dashboard
KPI cards: Customers (year-end), Turnover, EBITDA, Cash flow accumulated, CAC, Churn %.
Charts (recharts, navy+gold palette):
- Customer growth by month (line, 60 months)
- New customers per channel (stacked bar)
- Revenue vs costs per year (grouped bar)
- P&L waterfall (Income → Direct → Sales → OpEx → Salaries → EBITDA)
- Cash flow accumulated (area)
- Volume per price area SE1–SE4 (donut)

Top bar: year selector **2026–2030**, scenario selector, density toggle.

### Budget tool
- Grouped forms (tabs: Customers, Pricing, Costs, Salaries, Other) — live recompute
- Monthly grid 12×5 (customers, income, costs, result) — compact density
- Scenarios: Base / Optimistic / Pessimistic — save, duplicate, side-by-side compare
- Export to XLSX/CSV; re-import original workbook to reseed

## Technical approach
- Stack: existing TanStack Start + Tailwind + shadcn/ui · charts via `recharts` · xlsx via `xlsx` (SheetJS)
- `src/lib/budget/engine.ts` — pure TS `(Assumptions) → { monthly[], yearly[], kpis }`, mirrors Excel formulas, no spreadsheet runtime
- `src/lib/budget/types.ts`, `src/lib/budget/seed.ts` (extracted from workbook, year-shifted to 2026)
- Zustand + localStorage for scenarios (no auth in v1)
- Routes: `/` Dashboard · `/budget` (tabs) · `/budget/monthly` · `/scenarios`
- Components: `KpiCard`, `RevenueCostChart`, `CustomerGrowthChart`, `WaterfallChart`, `AssumptionsForm`, `MonthlyGrid`, `ScenarioSwitcher`, `Topbar`

## Out of scope (v1)
- Auth / shared scenarios across users
- Cell-level formula audit trail
- Full per-area SE1–SE4 weighted pricing (v1 = weighted average)
- Currency switching (SEK only)

## Open questions
1. Use the uploaded `.xlsx` as **baked-in seed** (recommended) or upload on first load?
2. UI language: **English** (matches `Prognos`) or **Swedish** (matches monthly sheets)?
3. **Scenario compare** in v1, or later?
