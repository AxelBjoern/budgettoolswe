
# Nordenergi Budget — Enterprise Upgrade (Phase 2)

Phase 1 already shipped: 10-year horizon, full P&L / CF / BS statements, revenue streams (solar/battery/VPP/SaaS), financing portfolio, sensitivity tornado, and board pack with Excel/PDF/PPTX exports. This phase closes the remaining gaps from your brief and lifts the whole tool to board-grade polish.

---

## 1 — Global Assumptions Sidebar

New left-rail `<AssumptionsSidebar/>` mounted in `_app.tsx`, collapsible (icon-rail when collapsed, matches existing Nordic style).

Grouped accordion sections, each row = label · unit · numeric input · tooltip showing the driver's downstream effect:
- **Customer growth** — new customers/channel, churn, sales start month, CAC
- **Pricing & margins** — price/kWh, cost/kWh, certificate, surcharge %, subscription, extras
- **Solar & Battery** — units/yr, price/unit, COGS %, recurring O&M
- **VPP / Grid services** — enrolled share, revenue/kW/yr
- **SaaS** — attach rate, fee/customer/month
- **Financing** — originations/yr, ticket, term, APR, fees, CoC, default, recovery
- **Costs** — salaries roster (existing editor), other external, invoicing, loan interest
- **Working capital & tax** — DSO, DPO, tax rate, depreciation years
- **Opening balance sheet** — cash, AR, AP, fixed assets, debt, equity

Footer: `Reset to default` · `Save as scenario…` · year-scope selector (all years vs single year override).

All edits route through existing `updateAssumptions` / `updateYear` so engine recomputes live. No new state model.

## 2 — Scenario Management Upgrade

- Topbar scenario selector becomes a richer dropdown with **duplicate**, **rename inline**, **delete**, **lock** (read-only badge), and **set as base**.
- New route `/_app/compare.tsx` — pick 2–4 scenarios, side-by-side annual P&L + KPI strip + overlaid 10y EBITDA / Revenue / Cash line charts with variance-vs-base column.
- Store: add `compareScenarios: string[]`, `lockedScenarioIds: string[]`, `baseScenarioId`. Bump persisted key to `v7-compare` with defensive migration.

## 3 — New Visualizations

Added to existing Results / Board pages — no new dependencies (Recharts already in):
- **EBITDA waterfall** — Revenue → COGS → Gross → Opex → D&A → Interest → Tax → Net, year-selectable.
- **Financing cash bridge** — disbursements (out) vs principal repayments + interest + fees (in) vs cost of funds + losses (out), per year.
- **Scenario overlay** on Revenue/EBITDA/Customers charts (toggle which scenarios to overlay).
- Sensitivity page: target-metric selector (10y EBITDA / cumulative CF / ending cash / NPV @ user discount rate).

## 4 — Monthly / Annual / 60-Month Tabs + Export

Refactor `/_app/monthly.tsx` and `/_app/results.tsx` into a single `/financials` page with tabs **Monthly | Annual | Full horizon (120 months)**. Each tab has a one-click "Export to Excel" using existing `exports.ts` helpers (extend with `exportTableToXlsx`).

## 5 — Board View Polish

`/_app/board.tsx` already exists. Upgrade:
- Hero KPI strip: 10y Revenue, EBITDA, EBITDA margin, ending customers, financing outstanding, ending cash, cumulative CFO.
- "Key risks & sensitivities" panel auto-populated from sensitivity top-3 drivers.
- Single-screen layout sized for 16:9 screenshot / copy into deck. Print stylesheet so `Cmd-P` produces a clean PDF directly.
- Existing Excel/PDF/PPTX export buttons stay.

## 6 — Audit Log & Versioning

Lightweight client-side, no backend:
- Store appends entries `{ ts, scenarioId, field, oldValue, newValue, source }` on every assumption mutation (cap last 200 per scenario).
- Topbar shows `v{N} · updated {relative time}`. `N` increments per session change batch (debounced 5s).
- New `/_app/changelog.tsx` — filterable table by scenario / field / date. "Revert this change" button restores prior value.

## 7 — Traceability ("why this number?")

- Wrap key KPI numbers in a `<TracedNumber>` component: hover/click opens popover listing the formula and contributing inputs with current values (e.g. `Electricity revenue = active customers × kWh/cust × price/kWh × (1 + surcharge)`).
- Powered by a small `src/lib/budget/traces.ts` map — no engine changes, just metadata.

## 8 — Design & UX

- Refine spacing scale, tighten table density toggle, add `tabular-nums` everywhere monetary.
- Skeleton loaders on heavy routes (sensitivity recompute, compare view).
- Smooth route transitions (CSS `view-transition-name`, progressive enhancement only).
- Tooltip system standardized via existing shadcn `tooltip`.

---

## Technical notes

- All work client-side, no backend, no Lovable Cloud.
- Store version `v6-financing` → `v7-enterprise` with one migration that adds `compareScenarios`, `lockedScenarioIds`, `baseScenarioId`, `auditLog`.
- Engine untouched except for memoization helper (`useComputedModel(scenario)`) to keep compare/sensitivity views fast on 10y × 120mo × N scenarios.
- New routes: `/compare`, `/changelog`. Existing `/monthly` + `/results` merged into `/financials`.
- New components: `AssumptionsSidebar`, `ScenarioMenu`, `WaterfallChart`, `FinancingBridge`, `TracedNumber`, `AuditLogTable`.

## Out of scope (deferred — confirmed earlier)

- Auth / roles / approval workflow (audit log is local-only)
- VDNX integration
- Live ops, asset monitoring, customer portal
- Real-time data feeds

---

## Suggested build order

1. Store v7 migration + audit log plumbing (foundation for everything)
2. AssumptionsSidebar + scenario menu upgrade
3. /compare route + waterfall + financing bridge charts
4. /financials tab merge + Excel export per tab
5. Board view polish + traceability popovers
6. /changelog + design pass

Approve and I'll build top-to-bottom, or call out modules to skip/reorder.
