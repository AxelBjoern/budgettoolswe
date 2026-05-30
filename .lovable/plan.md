# Merge Energy System Pricing Into Budget Tool

Keep the current budget model and Price Areas UI as-is. **Add** per-zone pricing (avg purchase / påslag / elcert in öre/kWh) on top, mirroring the Energy system's `PricingTab`, and let it optionally override the global `pricePerKwh` / `costPerKwh` / `certificateCostPerKwh` when populated.

## 1. Extend the data model (additive, no breaking changes)

`src/lib/budget/types.ts` — add an optional block, leave every existing field intact:

```ts
export interface AreaPricing {
  avgPurchaseOre: number; // öre/kWh (Energy system: avg_purchase_price_per_mwh / 10)
  pslagOre: number;       // öre/kWh (pslag_per_mwh / 10)
  elcertOre: number;      // öre/kWh (elcert_per_mwh / 10)
}
export interface YearAssumptions {
  // ...all existing fields untouched...
  /** Optional per-area pricing override. When defined, engine uses these per zone instead of global pricePerKwh/costPerKwh/certificateCostPerKwh. */
  priceAreaPricing?: Record<PriceAreaKey, AreaPricing>;
  /** Toggle to actually use priceAreaPricing in compute */
  useAreaPricing?: boolean;
}
```

Add `volumeByArea` is already there. Also add `revenueByArea` and `cogsByArea` to `YearlyRow` for the new chart (additive).

## 2. Engine — opt-in branch in compute()

`src/lib/budget/engine.ts`: inside the monthly loop, when `ya.useAreaPricing && ya.priceAreaPricing`, replace the single-line `electricityIncome` / `electricityCost` / `certificateCost` with a per-area sum, weighted by `priceAreaShare`:

```text
for each area k:
  kwhArea = kwhMonth * share[k]
  sellSEK = (avgPurchaseOre[k] + pslagOre[k]) / 100
  costSEK = avgPurchaseOre[k] / 100
  certSEK = elcertOre[k] / 100
  electricityIncome += kwhArea * sellSEK * (1 + surchargePct)
  electricityCost   += kwhArea * costSEK
  certificateCost   += kwhArea * certSEK
  certificateIncome += kwhArea * certSEK   // pass-through, same as today
  revenueByArea[k]  += kwhArea * sellSEK
  cogsByArea[k]     += kwhArea * (costSEK + certSEK)
```

When the toggle is off, the existing formulas stay byte-identical. No existing scenario changes its numbers.

## 3. Seed defaults (`src/lib/budget/seed.ts`)

Add — alongside the current globals, do not remove them:

```ts
priceAreaPricing: {
  SE1: { avgPurchaseOre: 28, pslagOre: 8, elcertOre: 4.5 },
  SE2: { avgPurchaseOre: 32, pslagOre: 8, elcertOre: 4.5 },
  SE3: { avgPurchaseOre: 58, pslagOre: 10, elcertOre: 4.5 },
  SE4: { avgPurchaseOre: 78, pslagOre: 12, elcertOre: 4.5 },
},
useAreaPricing: false, // start opt-in
```

## 4. Budget UI — extend the existing Price Areas tab

`src/routes/_app/budget.tsx`: keep the existing share editor exactly as it is. Below the share table, in the same `Panel` and same VDNX style (hairline borders, `tabular-nums`, `text-xs uppercase tracking-wider` headers), add:

- A switch **"Use per-area pricing"** bound to `ya.useAreaPricing`. When off, the rest of the section is dimmed and read-only.
- A second table with one row per zone:

```text
Zone | Avg öre/kWh | Påslag öre/kWh | Elcert öre/kWh | Total öre/kWh | SEK/kWh
```

Inputs use `step=0.001`, same `FieldNum` styling already used in the tab. Footer row shows volume-weighted average (using current `priceAreaShare`), matching the Energy system's "Snitt (vägt)" line.

Add a **"Sync from Energy system"** button in the same row as the existing *Reset / All to 1 / Export* buttons in the Budget header (not a new toolbar). Clicking opens a small dialog with:

- A textarea accepting the exact JSON returned by `listManagedZonePrices` in the Energy system (`[{ zone, avg_purchase_price_per_mwh, pslag_per_mwh, elcert_per_mwh, volume_mwh }, …]`).
- A checkbox **"Apply to all years"** (default on).
- A checkbox **"Also update area share from volumes"** (default off).
- On Apply: convert MWh→kWh and SEK/MWh→öre/kWh (×0.1), write into `priceAreaPricing`, and set `useAreaPricing = true`.

The existing **"All to 1"** reset is extended to also set every area's pricing fields to 1 so totals stay finite.

## 5. Dashboard — surface the new info without redesign

`src/routes/_app/index.tsx`: keep all current KPI cards and charts. Only:

- The "Volume per Price Area" card stays as-is.
- When `useAreaPricing` is on for the selected year, **add** a small companion bar chart **"Sell price per area (SEK/kWh)"** in the empty slot of the existing grid. Same `KpiCard`/chart styling. No layout reshuffle.
- KPI "Avg sell SEK/kWh" (if present) reads weighted average from `revenueByArea / volumeByArea` when area pricing is on; otherwise it shows the current `pricePerKwh`.

## 6. Out of scope

- Live cross-project DB fetch from the Energy system's Supabase. The sync stays paste-JSON for now; a follow-up can expose a public read endpoint there and replace the dialog with a one-click fetch.
- Monthly granularity per area (Energy system is monthly; budget tool stays yearly).
- Renaming or removing any existing assumption field — strictly additive.

## Files touched

- `src/lib/budget/types.ts` — additive: `AreaPricing`, optional `priceAreaPricing`, `useAreaPricing`, optional `revenueByArea`/`cogsByArea` on `YearlyRow`
- `src/lib/budget/engine.ts` — opt-in per-area branch
- `src/lib/budget/seed.ts` — defaults for the new fields
- `src/lib/budget/format.ts` — `fmtOre`, `fmtSekPerKwh`
- `src/routes/_app/budget.tsx` — extended Price Areas tab + Sync dialog
- `src/routes/_app/index.tsx` — optional per-area sell-price chart
