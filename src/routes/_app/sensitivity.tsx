import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useActiveScenario, useBudgetStore } from "@/lib/budget/store";
import { compute } from "@/lib/budget/engine";
import { buildSensitivity, DRIVERS } from "@/lib/budget/sensitivity";
import { SectionHeader } from "@/components/budget/SectionHeader";
import { fmtSEK } from "@/lib/budget/format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/_app/sensitivity")({
  head: () => ({
    meta: [
      { title: "Sensitivity — Nordenergi Budget" },
      {
        name: "description",
        content:
          "Tornado analysis of EBITDA drivers and scenario engine for budget stress testing.",
      },
    ],
  }),
  component: SensitivityPage,
});

function SensitivityPage() {
  const scenario = useActiveScenario();
  const scenarios = useBudgetStore((s) => s.scenarios);
  const [deltaPct, setDeltaPct] = useState(0.1);

  const sensitivity = useMemo(
    () => buildSensitivity(scenario.assumptions, deltaPct),
    [scenario.assumptions, deltaPct],
  );

  const compareData = useMemo(
    () =>
      scenarios.map((sc) => {
        const m = compute(sc.assumptions);
        return {
          name: sc.name,
          revenue: m.yearly.reduce((a, y) => a + y.totalIncome, 0),
          ebitda: m.yearly.reduce((a, y) => a + y.ebitda, 0),
          cashFlow: m.yearly.reduce((a, y) => a + y.cashFlow, 0),
          endCustomers: m.yearly[m.yearly.length - 1].endingCustomers,
          financingOut: m.yearly[m.yearly.length - 1].financingEndingOutstanding,
        };
      }),
    [scenarios],
  );

  const tornadoData = sensitivity.rows.map((r) => ({
    label: r.label,
    low: r.lowDelta,
    high: r.highDelta,
    spread: r.spread,
    group: r.group,
  }));

  const maxAbs = Math.max(
    ...sensitivity.rows.flatMap((r) => [Math.abs(r.lowDelta), Math.abs(r.highDelta)]),
    1,
  );

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Sensitivity & Scenarios"
        subtitle="Tornado on 10-year EBITDA + side-by-side scenario comparison"
        right={
          <div className="flex items-center gap-2">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              ± shock
            </Label>
            <Input
              type="number"
              step={1}
              min={1}
              max={50}
              value={Math.round(deltaPct * 100)}
              onChange={(e) =>
                setDeltaPct(Math.min(0.5, Math.max(0.01, Number(e.target.value) / 100)))
              }
              className="h-8 w-[70px] rounded-sm border-border bg-background text-right text-xs tabular-nums"
            />
            <span className="text-xs text-muted-foreground">%</span>
          </div>
        }
      />

      <section className="rounded-sm border border-border bg-card/50 p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tornado — impact on horizon EBITDA
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Base EBITDA: <span className="tabular-nums">{fmtSEK(sensitivity.baseEbitda, { compact: true })}</span>
              {" · "}Each bar shows ± {Math.round(deltaPct * 100)}% shock applied to the driver across all years
            </p>
          </div>
        </div>

        <div className="h-[480px] w-full">
          <ResponsiveContainer>
            <BarChart
              layout="vertical"
              data={tornadoData}
              margin={{ top: 8, right: 32, bottom: 8, left: 24 }}
              barCategoryGap={6}
            >
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" horizontal={false} />
              <XAxis
                type="number"
                domain={[-maxAbs, maxAbs]}
                tickFormatter={(v) => fmtSEK(v, { compact: true })}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={150}
                tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 2,
                  fontSize: 11,
                }}
                formatter={(v: number, name) => [fmtSEK(v, { compact: true }), name === "low" ? "− shock" : "+ shock"]}
              />
              <Bar dataKey="low" stackId="t" radius={[2, 0, 0, 2]}>
                {tornadoData.map((_, i) => (
                  <Cell key={i} fill="hsl(var(--destructive))" fillOpacity={0.75} />
                ))}
                <LabelList
                  dataKey="low"
                  position="insideLeft"
                  fill="hsl(var(--destructive-foreground, var(--foreground)))"
                  fontSize={10}
                  formatter={(v: number) => fmtSEK(v, { compact: true })}
                />
              </Bar>
              <Bar dataKey="high" stackId="t" radius={[0, 2, 2, 0]}>
                {tornadoData.map((_, i) => (
                  <Cell key={i} fill="hsl(var(--primary))" fillOpacity={0.85} />
                ))}
                <LabelList
                  dataKey="high"
                  position="insideRight"
                  fill="hsl(var(--primary-foreground))"
                  fontSize={10}
                  formatter={(v: number) => fmtSEK(v, { compact: true })}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-sm border border-border">
        <div className="border-b border-border px-4 py-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Driver detail (active scenario)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs tabular-nums">
            <thead className="bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Driver</th>
                <th className="px-3 py-2 text-left">Group</th>
                <th className="px-3 py-2 text-right">EBITDA − shock</th>
                <th className="px-3 py-2 text-right">EBITDA + shock</th>
                <th className="px-3 py-2 text-right">Δ low</th>
                <th className="px-3 py-2 text-right">Δ high</th>
                <th className="px-3 py-2 text-right">Spread</th>
              </tr>
            </thead>
            <tbody>
              {sensitivity.rows.map((r) => (
                <tr key={r.key} className="border-t border-border">
                  <td className="px-3 py-2 text-left">{r.label}</td>
                  <td className="px-3 py-2 text-left text-muted-foreground">{r.group}</td>
                  <td className="px-3 py-2 text-right">{fmtSEK(r.low, { compact: true })}</td>
                  <td className="px-3 py-2 text-right">{fmtSEK(r.high, { compact: true })}</td>
                  <td className={`px-3 py-2 text-right ${r.lowDelta < 0 ? "num-neg" : ""}`}>
                    {fmtSEK(r.lowDelta, { compact: true })}
                  </td>
                  <td className={`px-3 py-2 text-right ${r.highDelta < 0 ? "num-neg" : ""}`}>
                    {fmtSEK(r.highDelta, { compact: true })}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold">{fmtSEK(r.spread, { compact: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-sm border border-border">
        <div className="border-b border-border px-4 py-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Scenario comparison — horizon totals
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs tabular-nums">
            <thead className="bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Scenario</th>
                <th className="px-3 py-2 text-right">Revenue</th>
                <th className="px-3 py-2 text-right">EBITDA</th>
                <th className="px-3 py-2 text-right">Cash flow</th>
                <th className="px-3 py-2 text-right">End customers</th>
                <th className="px-3 py-2 text-right">Financing outstanding</th>
              </tr>
            </thead>
            <tbody>
              {compareData.map((c) => (
                <tr key={c.name} className="border-t border-border">
                  <td className="px-3 py-2 text-left font-medium">{c.name}</td>
                  <td className="px-3 py-2 text-right">{fmtSEK(c.revenue, { compact: true })}</td>
                  <td className={`px-3 py-2 text-right ${c.ebitda < 0 ? "num-neg" : ""}`}>
                    {fmtSEK(c.ebitda, { compact: true })}
                  </td>
                  <td className={`px-3 py-2 text-right ${c.cashFlow < 0 ? "num-neg" : ""}`}>
                    {fmtSEK(c.cashFlow, { compact: true })}
                  </td>
                  <td className="px-3 py-2 text-right">{c.endCustomers.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">{fmtSEK(c.financingOut, { compact: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-[11px] text-muted-foreground">
        Sensitivity uses {DRIVERS.length} drivers · perturbation applies the multiplier to every forecast year · EBITDA is summed across the full {scenario.assumptions.years}-year horizon.
      </p>
    </div>
  );
}
