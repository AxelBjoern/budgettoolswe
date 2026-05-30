import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useActiveScenario, useBudgetStore } from "@/lib/budget/store";
import { buildFinancing, defaultFinancing } from "@/lib/budget/financing";
import { SectionHeader } from "@/components/budget/SectionHeader";
import { KpiCard } from "@/components/budget/KpiCard";
import { fmtSEK, fmtNum } from "@/lib/budget/format";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FinancingAssumptions } from "@/lib/budget/types";

export const Route = createFileRoute("/_app/financing")({
  head: () => ({
    meta: [
      { title: "Financing — Nordenergi Budget" },
      {
        name: "description",
        content:
          "Loan/lease origination, portfolio outstanding, net interest margin and default losses.",
      },
    ],
  }),
  component: FinancingPage,
});

function FinancingPage() {
  const scenario = useActiveScenario();
  const updateAssumptions = useBudgetStore((s) => s.updateAssumptions);

  const a = scenario.assumptions;
  const years = a.years;
  const f: FinancingAssumptions = a.financing ?? defaultFinancing(years);

  const portfolio = useMemo(() => buildFinancing(a), [a]);

  const setF = (patch: Partial<FinancingAssumptions>) =>
    updateAssumptions(scenario.id, { financing: { ...f, ...patch } });

  const setOrigYear = (idx: number, v: number) => {
    const arr = [...(f.originationsPerYear.length ? f.originationsPerYear : Array(years).fill(0))];
    while (arr.length < years) arr.push(0);
    arr[idx] = v;
    setF({ originationsPerYear: arr });
  };

  const totalInc = portfolio.yearly.reduce((s, r) => s + r.totalIncome, 0);
  const totalCost = portfolio.yearly.reduce((s, r) => s + r.totalCost, 0);
  const peakOutstanding = portfolio.monthly.reduce(
    (m, r) => Math.max(m, r.outstanding),
    0,
  );
  const finalOutstanding =
    portfolio.monthly[portfolio.monthly.length - 1]?.outstanding ?? 0;
  const totalLosses = portfolio.yearly.reduce((s, r) => s + r.defaultLoss, 0);

  const chartData = portfolio.monthly.map((r) => ({
    label: `${String(r.year).slice(2)}-${String(r.month).padStart(2, "0")}`,
    outstanding: Math.round(r.outstanding),
    nim: Math.round(r.netInterestMargin),
    income: Math.round(r.totalIncome),
    cost: Math.round(r.totalCost),
  }));

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Financing portfolio"
        subtitle={`Scenario · ${scenario.name}`}
      />

      <div className="rounded-sm border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <div className="text-sm font-semibold">Enable financing module</div>
            <p className="text-xs text-muted-foreground">
              Pool-level loan book. Interest income, origination fees, cost of
              funds and default losses flow into the main P&amp;L automatically.
            </p>
          </div>
          <Switch checked={!!f.enabled} onCheckedChange={(v) => setF({ enabled: v })} />
        </div>

        <div className={`mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 ${f.enabled ? "" : "opacity-60"}`}>
          <FieldNum
            label="Avg principal / loan (SEK)"
            value={f.avgPrincipal}
            onChange={(v) => setF({ avgPrincipal: v })}
          />
          <FieldNum
            label="Term (months)"
            value={f.termMonths}
            onChange={(v) => setF({ termMonths: Math.max(1, v) })}
          />
          <FieldNum
            label="Customer APR (%)"
            value={f.customerAPR * 100}
            step={0.1}
            onChange={(v) => setF({ customerAPR: v / 100 })}
          />
          <FieldNum
            label="Origination fee (%)"
            value={f.originationFeePct * 100}
            step={0.1}
            onChange={(v) => setF({ originationFeePct: v / 100 })}
          />
          <FieldNum
            label="Cost of capital (%)"
            value={f.costOfCapitalPct * 100}
            step={0.1}
            onChange={(v) => setF({ costOfCapitalPct: v / 100 })}
          />
          <FieldNum
            label="Annual default rate (%)"
            value={f.defaultAnnualPct * 100}
            step={0.1}
            onChange={(v) => setF({ defaultAnnualPct: v / 100 })}
          />
          <FieldNum
            label="Recovery rate (%)"
            value={f.recoveryPct * 100}
            step={1}
            onChange={(v) => setF({ recoveryPct: v / 100 })}
          />
          <FieldNum
            label="Opening outstanding (SEK)"
            value={f.openingOutstanding ?? 0}
            onChange={(v) => setF({ openingOutstanding: v })}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Lifetime income" value={fmtSEK(totalInc, { compact: true })} />
        <KpiCard
          label="Net margin"
          value={fmtSEK(totalInc - totalCost, { compact: true })}
          tone={totalInc - totalCost >= 0 ? "positive" : "negative"}
        />
        <KpiCard label="Peak outstanding" value={fmtSEK(peakOutstanding, { compact: true })} />
        <KpiCard
          label="Cumulative losses"
          value={fmtSEK(totalLosses, { compact: true })}
          tone="negative"
        />
      </div>

      <div className="rounded-sm border border-border bg-card p-4">
        <h3 className="mb-3 border-b border-border pb-2 font-serif text-base font-bold">
          Originations by year
        </h3>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: years }, (_, i) => (
            <FieldNum
              key={i}
              label={`${a.startYear + i}`}
              value={f.originationsPerYear[i] ?? 0}
              onChange={(v) => setOrigYear(i, v)}
            />
          ))}
        </div>
      </div>

      <div className="rounded-sm border border-border bg-card p-4">
        <h3 className="mb-3 border-b border-border pb-2 font-serif text-base font-bold">
          Outstanding balance
        </h3>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={11} />
              <YAxis
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => fmtSEK(v as number, { compact: true })}
              />
              <Tooltip
                formatter={(v) => fmtSEK(Number(v))}
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
              />
              <Area
                type="monotone"
                dataKey="outstanding"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary) / 0.2)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-sm border border-border bg-card p-4">
        <h3 className="mb-3 border-b border-border pb-2 font-serif text-base font-bold">
          Annual portfolio P&amp;L
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead className="bg-muted/60 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Year</th>
                <th className="px-3 py-2 text-right">New loans</th>
                <th className="px-3 py-2 text-right">Disbursed</th>
                <th className="px-3 py-2 text-right">Interest income</th>
                <th className="px-3 py-2 text-right">Fees</th>
                <th className="px-3 py-2 text-right">Cost of funds</th>
                <th className="px-3 py-2 text-right">Defaults</th>
                <th className="px-3 py-2 text-right">Net margin</th>
                <th className="px-3 py-2 text-right">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.yearly.map((r) => (
                <tr key={r.year} className="border-t border-border">
                  <td className="px-3 py-1.5 font-medium">{r.year}</td>
                  <td className="px-3 py-1.5 text-right">{fmtNum(Math.round(r.newOriginations))}</td>
                  <td className="px-3 py-1.5 text-right">{fmtSEK(r.disbursed, { compact: true })}</td>
                  <td className="px-3 py-1.5 text-right">{fmtSEK(r.interestIncome, { compact: true })}</td>
                  <td className="px-3 py-1.5 text-right">{fmtSEK(r.originationFees, { compact: true })}</td>
                  <td className="px-3 py-1.5 text-right text-muted-foreground">
                    {fmtSEK(r.costOfFunds, { compact: true })}
                  </td>
                  <td className="px-3 py-1.5 text-right text-destructive">
                    {fmtSEK(r.defaultLoss, { compact: true })}
                  </td>
                  <td className={`px-3 py-1.5 text-right ${r.netMargin >= 0 ? "" : "text-destructive"}`}>
                    {fmtSEK(r.netMargin, { compact: true })}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    {fmtSEK(r.endingOutstanding, { compact: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Final outstanding: {fmtSEK(finalOutstanding)}.
        </p>
      </div>
    </div>
  );
}

function FieldNum({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <Input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        step={step ?? 1}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 rounded-sm border-border bg-background tabular-nums"
      />
    </div>
  );
}
