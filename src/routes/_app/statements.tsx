import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useActiveScenario, useBudgetStore } from "@/lib/budget/store";
import { buildStatements, compute } from "@/lib/budget/engine";
import { SectionHeader } from "@/components/budget/SectionHeader";
import { fmtSEK, MONTHS } from "@/lib/budget/format";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  BalanceSheetRow,
  CashFlowRow,
  PnLRow,
} from "@/lib/budget/types";

export const Route = createFileRoute("/_app/statements")({
  head: () => ({
    meta: [
      { title: "Statements — Nordenergi Budget" },
      {
        name: "description",
        content:
          "Full P&L, cash flow and balance sheet projection across the 10-year horizon.",
      },
    ],
  }),
  component: StatementsPage,
});

type View = "monthly" | "annual";

function StatementsPage() {
  const scenario = useActiveScenario();
  const year = useBudgetStore((s) => s.selectedYear);
  const updateAssumptions = useBudgetStore((s) => s.updateAssumptions);
  const [view, setView] = useState<View>("annual");

  const model = useMemo(() => compute(scenario.assumptions), [scenario]);
  const statements = useMemo(
    () => buildStatements(model, scenario.assumptions),
    [model, scenario.assumptions],
  );

  const a = scenario.assumptions;
  const opening = a.opening ?? {
    cash: 0, accountsReceivable: 0, accountsPayable: 0,
    fixedAssets: 0, debt: 0, equity: 0,
  };
  const setOpening = (patch: Partial<typeof opening>) =>
    updateAssumptions(scenario.id, { opening: { ...opening, ...patch } });


  return (
    <div className="space-y-6">
      <SectionHeader
        title="Financial statements"
        subtitle={`Scenario · ${scenario.name} · ${scenario.assumptions.years}y horizon`}
        right={
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={view === "annual" ? "default" : "outline"}
              className="h-8 rounded-sm"
              onClick={() => setView("annual")}
            >
              Annual
            </Button>
            <Button
              size="sm"
              variant={view === "monthly" ? "default" : "outline"}
              className="h-8 rounded-sm"
              onClick={() => setView("monthly")}
            >
              Monthly · {year}
            </Button>
          </div>
        }
      />

      <div className="rounded-sm border border-border bg-card p-4">
        <div className="mb-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Statements assumptions
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <NumField label="Tax rate %" value={(a.taxRate ?? 0) * 100}
            onChange={(v) => updateAssumptions(scenario.id, { taxRate: v / 100 })} step={0.5} />
          <NumField label="Depr. years" value={a.depreciationYears ?? 5}
            onChange={(v) => updateAssumptions(scenario.id, { depreciationYears: v })} step={1} />
          <NumField label="DSO (days)" value={a.dso ?? 0}
            onChange={(v) => updateAssumptions(scenario.id, { dso: v })} step={1} />
          <NumField label="DPO (days)" value={a.dpo ?? 0}
            onChange={(v) => updateAssumptions(scenario.id, { dpo: v })} step={1} />
        </div>
        <div className="mt-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Opening balance sheet (SEK)
        </div>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <NumField label="Cash" value={opening.cash} onChange={(v) => setOpening({ cash: v })} />
          <NumField label="A/R" value={opening.accountsReceivable} onChange={(v) => setOpening({ accountsReceivable: v })} />
          <NumField label="A/P" value={opening.accountsPayable} onChange={(v) => setOpening({ accountsPayable: v })} />
          <NumField label="Fixed assets" value={opening.fixedAssets} onChange={(v) => setOpening({ fixedAssets: v })} />
          <NumField label="Debt" value={opening.debt} onChange={(v) => setOpening({ debt: v })} />
          <NumField label="Equity" value={opening.equity} onChange={(v) => setOpening({ equity: v })} />
        </div>
      </div>

      <Tabs defaultValue="pnl" className="w-full">

        <TabsList className="rounded-sm">
          <TabsTrigger value="pnl">P&amp;L</TabsTrigger>
          <TabsTrigger value="cf">Cash Flow</TabsTrigger>
          <TabsTrigger value="bs">Balance Sheet</TabsTrigger>
        </TabsList>

        <TabsContent value="pnl" className="mt-4">
          <PnLTable rows={statements.pnl} view={view} year={year} />
        </TabsContent>
        <TabsContent value="cf" className="mt-4">
          <CashFlowTable rows={statements.cashFlow} view={view} year={year} />
        </TabsContent>
        <TabsContent value="bs" className="mt-4">
          <BalanceSheetTable
            rows={statements.balanceSheet}
            view={view}
            year={year}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- Annual / monthly aggregation helpers ---------------- */

function annualizePnL(rows: PnLRow[]): PnLRow[] {
  const map = new Map<number, PnLRow>();
  for (const r of rows) {
    const acc = map.get(r.year) ?? {
      year: r.year, month: 0,
      revenue: 0, cogs: 0, grossProfit: 0,
      opex: 0, ebitda: 0, depreciation: 0,
      ebit: 0, interest: 0, ebt: 0, tax: 0, netIncome: 0,
    };
    acc.revenue += r.revenue;
    acc.cogs += r.cogs;
    acc.grossProfit += r.grossProfit;
    acc.opex += r.opex;
    acc.ebitda += r.ebitda;
    acc.depreciation += r.depreciation;
    acc.ebit += r.ebit;
    acc.interest += r.interest;
    acc.ebt += r.ebt;
    acc.tax += r.tax;
    acc.netIncome += r.netIncome;
    map.set(r.year, acc);
  }
  return [...map.values()].sort((a, b) => a.year - b.year);
}

function annualizeCF(rows: CashFlowRow[]): CashFlowRow[] {
  const map = new Map<number, CashFlowRow>();
  for (const r of rows) {
    const acc = map.get(r.year) ?? {
      year: r.year, month: 0,
      netIncome: 0, depreciation: 0, changeAR: 0, changeAP: 0,
      cfo: 0, capex: 0, cfi: 0, debtChange: 0, cff: 0,
      netChange: 0, endingCash: 0,
    };
    acc.netIncome += r.netIncome;
    acc.depreciation += r.depreciation;
    acc.changeAR += r.changeAR;
    acc.changeAP += r.changeAP;
    acc.cfo += r.cfo;
    acc.capex += r.capex;
    acc.cfi += r.cfi;
    acc.debtChange += r.debtChange;
    acc.cff += r.cff;
    acc.netChange += r.netChange;
    acc.endingCash = r.endingCash; // end-of-year value
    map.set(r.year, acc);
  }
  return [...map.values()].sort((a, b) => a.year - b.year);
}

function annualizeBS(rows: BalanceSheetRow[]): BalanceSheetRow[] {
  // Balance sheet is a snapshot — take December of each year.
  const map = new Map<number, BalanceSheetRow>();
  for (const r of rows) {
    const existing = map.get(r.year);
    if (!existing || r.month > existing.month) map.set(r.year, r);
  }
  return [...map.values()].sort((a, b) => a.year - b.year);
}

/* ---------------- Tables ---------------- */

const cellCls =
  "border-b border-border px-3 py-1.5 text-right tabular-nums";
const headerCls =
  "sticky top-0 bg-card border-b border-border px-3 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground";
const labelCls =
  "border-b border-border px-3 py-1.5 text-left font-medium";

function periodLabel(r: { year: number; month: number }, view: View) {
  if (view === "annual") return String(r.year);
  return MONTHS[r.month - 1];
}

function StatementTable<T extends { year: number; month: number }>({
  rows,
  view,
  year,
  rowDefs,
}: {
  rows: T[];
  view: View;
  year: number;
  rowDefs: { label: string; get: (r: T) => number; bold?: boolean }[];
}) {
  const periods =
    view === "annual" ? rows : rows.filter((r) => r.year === year);

  return (
    <div className="overflow-x-auto rounded-sm border border-border bg-card">
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className={headerCls}>Item</th>
            {periods.map((p, i) => (
              <th key={i} className={`${headerCls} text-right`}>
                {periodLabel(p, view)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowDefs.map((rd) => (
            <tr key={rd.label} className={rd.bold ? "font-bold" : ""}>
              <td className={labelCls}>{rd.label}</td>
              {periods.map((p, i) => (
                <td key={i} className={cellCls}>
                  {fmtSEK(rd.get(p), { compact: true })}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PnLTable({
  rows,
  view,
  year,
}: {
  rows: PnLRow[];
  view: View;
  year: number;
}) {
  const data = view === "annual" ? annualizePnL(rows) : rows;
  return (
    <StatementTable
      rows={data}
      view={view}
      year={year}
      rowDefs={[
        { label: "Revenue", get: (r) => r.revenue, bold: true },
        { label: "Cost of goods sold", get: (r) => -r.cogs },
        { label: "Gross profit", get: (r) => r.grossProfit, bold: true },
        { label: "Operating expenses", get: (r) => -r.opex },
        { label: "EBITDA", get: (r) => r.ebitda, bold: true },
        { label: "Depreciation", get: (r) => -r.depreciation },
        { label: "EBIT", get: (r) => r.ebit, bold: true },
        { label: "Interest", get: (r) => -r.interest },
        { label: "EBT", get: (r) => r.ebt },
        { label: "Tax", get: (r) => -r.tax },
        { label: "Net income", get: (r) => r.netIncome, bold: true },
      ]}
    />
  );
}

function CashFlowTable({
  rows,
  view,
  year,
}: {
  rows: CashFlowRow[];
  view: View;
  year: number;
}) {
  const data = view === "annual" ? annualizeCF(rows) : rows;
  return (
    <StatementTable
      rows={data}
      view={view}
      year={year}
      rowDefs={[
        { label: "Net income", get: (r) => r.netIncome },
        { label: "+ Depreciation", get: (r) => r.depreciation },
        { label: "− Δ Accounts receivable", get: (r) => -r.changeAR },
        { label: "+ Δ Accounts payable", get: (r) => r.changeAP },
        { label: "Cash from operations", get: (r) => r.cfo, bold: true },
        { label: "Capex", get: (r) => -r.capex },
        { label: "Cash from investing", get: (r) => r.cfi, bold: true },
        { label: "Debt change", get: (r) => r.debtChange },
        { label: "Cash from financing", get: (r) => r.cff, bold: true },
        { label: "Net change in cash", get: (r) => r.netChange, bold: true },
        { label: "Ending cash", get: (r) => r.endingCash, bold: true },
      ]}
    />
  );
}

function BalanceSheetTable({
  rows,
  view,
  year,
}: {
  rows: BalanceSheetRow[];
  view: View;
  year: number;
}) {
  const data = view === "annual" ? annualizeBS(rows) : rows;
  return (
    <StatementTable
      rows={data}
      view={view}
      year={year}
      rowDefs={[
        { label: "Cash", get: (r) => r.cash },
        { label: "Accounts receivable", get: (r) => r.accountsReceivable },
        { label: "Fixed assets", get: (r) => r.fixedAssets },
        { label: "Total assets", get: (r) => r.totalAssets, bold: true },
        { label: "Accounts payable", get: (r) => r.accountsPayable },
        { label: "Debt", get: (r) => r.debt },
        { label: "Total liabilities", get: (r) => r.totalLiabilities, bold: true },
        { label: "Equity", get: (r) => r.equity },
        { label: "Total liab. + equity", get: (r) => r.totalLiabEquity, bold: true },
        { label: "Check (assets − L&E)", get: (r) => r.check },
      ]}
    />
  );
}
