import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useActiveScenario } from "@/lib/budget/store";
import { compute } from "@/lib/budget/engine";
import { SectionHeader } from "@/components/budget/SectionHeader";
import { fmtSEK, fmtNum, MONTHS } from "@/lib/budget/format";

export const Route = createFileRoute("/_app/budget/monthly")({
  head: () => ({
    meta: [
      { title: "Monthly grid — Nordenergi Budget" },
      { name: "description", content: "12-month rollup per year for all forecast years." },
    ],
  }),
  component: MonthlyGrid,
});

const METRICS = [
  { key: "endingCustomers", label: "Customers", fmt: fmtNum },
  { key: "totalIncome", label: "Income", fmt: (n: number) => fmtSEK(n) },
  { key: "totalCost", label: "Cost", fmt: (n: number) => fmtSEK(n) },
  { key: "ebitda", label: "EBITDA", fmt: (n: number) => fmtSEK(n) },
  { key: "cashFlow", label: "Cash flow", fmt: (n: number) => fmtSEK(n) },
] as const;

function MonthlyGrid() {
  const scenario = useActiveScenario();
  const model = useMemo(() => compute(scenario.assumptions), [scenario]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Monthly grid"
        subtitle={`Scenario · ${scenario.name}`}
      />

      {scenario.assumptions.perYear.map((_, yi) => {
        const year = scenario.assumptions.startYear + yi;
        const rows = model.monthly.filter((m) => m.year === year);
        return (
          <div key={year} className="rounded-sm border border-border bg-card">
            <div className="flex items-baseline justify-between border-b border-border px-4 py-2">
              <h3 className="font-serif text-base font-bold">{year}</h3>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                12 months
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs tabular-nums">
                <thead className="bg-muted/60 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Metric</th>
                    {MONTHS.map((m) => (
                      <th key={m} className="px-2 py-2 text-right">{m}</th>
                    ))}
                    <th className="px-3 py-2 text-right">Total / EoY</th>
                  </tr>
                </thead>
                <tbody>
                  {METRICS.map((metric) => (
                    <tr key={metric.key} className="border-t border-border">
                      <td className="px-3 py-1.5 font-medium">{metric.label}</td>
                      {rows.map((r, i) => {
                        const v = (r as any)[metric.key] as number;
                        return (
                          <td
                            key={i}
                            className={`px-2 py-1.5 text-right ${v < 0 ? "num-neg" : ""}`}
                          >
                            {metric.fmt(v)}
                          </td>
                        );
                      })}
                      <td className="px-3 py-1.5 text-right font-semibold">
                        {metric.key === "endingCustomers"
                          ? fmtNum(rows[rows.length - 1]?.endingCustomers ?? 0)
                          : fmtSEK(
                              rows.reduce(
                                (acc, r) => acc + ((r as any)[metric.key] as number),
                                0,
                              ),
                            )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
