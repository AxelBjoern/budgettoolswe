import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useBudgetStore } from "@/lib/budget/store";
import { compute } from "@/lib/budget/engine";
import { SectionHeader } from "@/components/budget/SectionHeader";
import { KpiCard } from "@/components/budget/KpiCard";
import { fmtSEK, fmtNum, fmtPct } from "@/lib/budget/format";

export const Route = createFileRoute("/_app/compare")({
  head: () => ({
    meta: [
      { title: "Compare Scenarios — Nordenergi Budget" },
      {
        name: "description",
        content: "Side-by-side scenario comparison with variance vs base.",
      },
    ],
  }),
  component: ComparePage,
});

const PALETTE = ["hsl(var(--primary))", "hsl(var(--foreground))", "hsl(var(--accent))", "hsl(var(--success))"];

function ComparePage() {
  const scenarios = useBudgetStore((s) => s.scenarios);
  const compareIds = useBudgetStore((s) => s.compareScenarios);
  const setCompare = useBudgetStore((s) => s.setCompareScenarios);
  const baseId = useBudgetStore((s) => s.baseScenarioId);

  const selected = useMemo(
    () =>
      compareIds
        .map((id) => scenarios.find((s) => s.id === id))
        .filter(Boolean) as typeof scenarios,
    [scenarios, compareIds],
  );

  const models = useMemo(
    () => selected.map((sc) => ({ sc, model: compute(sc.assumptions) })),
    [selected],
  );

  const base = models.find((m) => m.sc.id === baseId) ?? models[0];

  const overlayData = useMemo(() => {
    if (!models.length) return [];
    const years = models[0].model.yearly.map((y) => y.year);
    return years.map((yr, i) => {
      const row: Record<string, number | string> = { year: String(yr) };
      models.forEach(({ sc, model }) => {
        row[`${sc.name}__rev`] = model.yearly[i].totalIncome;
        row[`${sc.name}__ebitda`] = model.yearly[i].ebitda;
        row[`${sc.name}__cash`] = model.yearly[i].cashFlow;
        row[`${sc.name}__cust`] = model.yearly[i].endingCustomers;
      });
      return row;
    });
  }, [models]);

  const toggle = (id: string) => {
    if (compareIds.includes(id)) {
      setCompare(compareIds.filter((x) => x !== id));
    } else {
      setCompare([...compareIds, id]);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Compare scenarios"
        subtitle="Pick up to 4 scenarios · variance vs base"
      />

      <div className="flex flex-wrap gap-2">
        {scenarios.map((sc) => {
          const on = compareIds.includes(sc.id);
          const isBase = sc.id === baseId;
          return (
            <button
              key={sc.id}
              onClick={() => toggle(sc.id)}
              className={`rounded-sm border px-3 py-1.5 text-xs transition-colors ${
                on
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {sc.name} {isBase && <span className="text-[10px] text-primary">(base)</span>}
            </button>
          );
        })}
      </div>

      {!models.length ? (
        <p className="text-sm text-muted-foreground">Select scenarios to compare.</p>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {models.map(({ sc, model }) => {
              const rev = model.yearly.reduce((a, y) => a + y.totalIncome, 0);
              const ebitda = model.yearly.reduce((a, y) => a + y.ebitda, 0);
              const baseRev = base ? base.model.yearly.reduce((a, y) => a + y.totalIncome, 0) : rev;
              const variance = baseRev === 0 ? 0 : (rev - baseRev) / Math.abs(baseRev);
              return (
                <KpiCard
                  key={sc.id}
                  label={`${sc.name} · 10y revenue`}
                  value={fmtSEK(rev, { compact: true })}
                  sub={
                    sc.id === base?.sc.id
                      ? `EBITDA ${fmtSEK(ebitda, { compact: true })} · base`
                      : `EBITDA ${fmtSEK(ebitda, { compact: true })} · Δ ${variance >= 0 ? "+" : ""}${fmtPct(variance)}`
                  }
                  tone={variance >= 0 ? "positive" : "negative"}
                />
              );
            })}
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <ChartFrame title="Revenue overlay">
              <ResponsiveContainer>
                <LineChart data={overlayData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => fmtSEK(v, { compact: true })} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 2, fontSize: 11 }}
                    formatter={(v: number) => fmtSEK(v, { compact: true })}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {models.map(({ sc }, idx) => (
                    <Line
                      key={sc.id}
                      dataKey={`${sc.name}__rev`}
                      name={sc.name}
                      stroke={PALETTE[idx % PALETTE.length]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </ChartFrame>

            <ChartFrame title="EBITDA overlay">
              <ResponsiveContainer>
                <LineChart data={overlayData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => fmtSEK(v, { compact: true })} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 2, fontSize: 11 }}
                    formatter={(v: number) => fmtSEK(v, { compact: true })}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {models.map(({ sc }, idx) => (
                    <Line
                      key={sc.id}
                      dataKey={`${sc.name}__ebitda`}
                      name={sc.name}
                      stroke={PALETTE[idx % PALETTE.length]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </ChartFrame>

            <ChartFrame title="Cash flow overlay">
              <ResponsiveContainer>
                <BarChart data={overlayData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => fmtSEK(v, { compact: true })} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 2, fontSize: 11 }}
                    formatter={(v: number) => fmtSEK(v, { compact: true })}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {models.map(({ sc }, idx) => (
                    <Bar
                      key={sc.id}
                      dataKey={`${sc.name}__cash`}
                      name={sc.name}
                      fill={PALETTE[idx % PALETTE.length]}
                      fillOpacity={0.7}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>

            <ChartFrame title="Customers overlay">
              <ResponsiveContainer>
                <LineChart data={overlayData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => fmtNum(v)} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 2, fontSize: 11 }}
                    formatter={(v: number) => fmtNum(v)}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {models.map(({ sc }, idx) => (
                    <Line
                      key={sc.id}
                      dataKey={`${sc.name}__cust`}
                      name={sc.name}
                      stroke={PALETTE[idx % PALETTE.length]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </ChartFrame>
          </section>

          <section className="rounded-sm border border-border">
            <div className="border-b border-border px-4 py-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Annual variance vs base ({base?.sc.name})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs tabular-nums">
                <thead className="bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Year</th>
                    {models.map(({ sc }) => (
                      <th key={sc.id} className="px-3 py-2 text-right">
                        {sc.name} EBITDA
                      </th>
                    ))}
                    {models.filter((m) => m.sc.id !== base?.sc.id).map(({ sc }) => (
                      <th key={`${sc.id}-d`} className="px-3 py-2 text-right">
                        Δ {sc.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {base?.model.yearly.map((_, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-1.5 text-left font-medium">
                        {base.model.yearly[i].year}
                      </td>
                      {models.map(({ sc, model }) => (
                        <td key={sc.id} className="px-3 py-1.5 text-right">
                          {fmtSEK(model.yearly[i].ebitda, { compact: true })}
                        </td>
                      ))}
                      {models
                        .filter((m) => m.sc.id !== base?.sc.id)
                        .map(({ sc, model }) => {
                          const d = model.yearly[i].ebitda - base.model.yearly[i].ebitda;
                          return (
                            <td
                              key={`${sc.id}-d`}
                              className={`px-3 py-1.5 text-right ${d < 0 ? "text-destructive" : "text-success"}`}
                            >
                              {d >= 0 ? "+" : ""}
                              {fmtSEK(d, { compact: true })}
                            </td>
                          );
                        })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
      {/* unused cell import guard */}
      <Cell />
    </div>
  );
}

function ChartFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-sm border border-border bg-card/40 p-3">
      <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      <div className="h-[280px] w-full">{children}</div>
    </div>
  );
}
