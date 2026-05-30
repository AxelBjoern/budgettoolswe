import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useActiveScenario, useBudgetStore } from "@/lib/budget/store";
import { buildResults, compute } from "@/lib/budget/engine";
import { SectionHeader } from "@/components/budget/SectionHeader";
import { KpiCard } from "@/components/budget/KpiCard";
import { fmtSEK, fmtNum, MONTHS } from "@/lib/budget/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eraser, ClipboardPaste } from "lucide-react";

export const Route = createFileRoute("/_app/results")({
  head: () => ({
    meta: [
      { title: "Results — Nordenergi Budget" },
      {
        name: "description",
        content:
          "Enter actual monthly customers, income and cost and compare against the budget.",
      },
    ],
  }),
  component: ResultsPage,
});

function pct(actual: number, budget: number): string {
  if (!budget) return "—";
  return `${(((actual - budget) / Math.abs(budget)) * 100).toFixed(1)}%`;
}

function ResultsPage() {
  const scenario = useActiveScenario();
  const year = useBudgetStore((s) => s.selectedYear);
  const setActual = useBudgetStore((s) => s.setActual);
  const clearActuals = useBudgetStore((s) => s.clearActuals);

  const model = useMemo(() => compute(scenario.assumptions), [scenario]);
  const results = useMemo(
    () => buildResults(model, scenario.actuals, year),
    [model, scenario.actuals, year],
  );

  const deltaIncome = results.ytdActual.income - results.ytdBudget.income;
  const deltaPct = pct(results.ytdActual.income, results.ytdBudget.income);

  const copyBudget = () => {
    if (!confirm(`Copy budget numbers to actuals for ${year}?`)) return;
    for (const r of results.rows) {
      setActual(scenario.id, year, r.month, {
        customers: r.budget.customers,
        totalIncome: r.budget.income,
        totalCost: r.budget.cost,
      });
    }
  };

  const setField = (
    month: number,
    field: "customers" | "totalIncome" | "totalCost",
    raw: string,
  ) => {
    const v = raw === "" ? undefined : Number(raw);
    setActual(scenario.id, year, month, { [field]: v });
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title={`Results · ${year}`}
        subtitle={`Scenario · ${scenario.name}`}
        right={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-sm"
              onClick={copyBudget}
            >
              <ClipboardPaste className="mr-1 h-3.5 w-3.5" />
              Copy budget → actuals
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-sm"
              onClick={() => {
                if (confirm(`Clear all actuals for ${year}?`))
                  clearActuals(scenario.id, year);
              }}
            >
              <Eraser className="mr-1 h-3.5 w-3.5" />
              Clear year
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="YTD actual income"
          value={fmtSEK(results.ytdActual.income, { compact: true })}
          sub={`Budget ${fmtSEK(results.ytdBudget.income, { compact: true })}`}
        />
        <KpiCard
          label="Δ vs budget"
          value={deltaPct}
          tone={deltaIncome >= 0 ? "positive" : "negative"}
          sub={fmtSEK(deltaIncome, { compact: true })}
        />
        <KpiCard
          label="YTD actual EBITDA"
          value={fmtSEK(results.ytdActual.ebitda, { compact: true })}
          tone={results.ytdActual.ebitda >= 0 ? "positive" : "negative"}
          sub={`Budget ${fmtSEK(results.ytdBudget.ebitda, { compact: true })}`}
        />
        <KpiCard
          label="Latest customers"
          value={
            results.latestCustomers
              ? fmtNum(results.latestCustomers.value)
              : "—"
          }
          sub={
            results.latestCustomers
              ? `As of ${MONTHS[results.latestCustomers.month - 1]} ${year}`
              : "No reports yet"
          }
        />
      </div>

      <div className="overflow-x-auto rounded-sm border border-border">
        <table className="w-full text-xs tabular-nums">
          <thead className="bg-muted/60 text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Month</th>
              <th className="px-3 py-2 text-right">Customers (actual)</th>
              <th className="px-3 py-2 text-right">Bud. cust.</th>
              <th className="px-3 py-2 text-right">Income (actual)</th>
              <th className="px-3 py-2 text-right">Bud. income</th>
              <th className="px-3 py-2 text-right">Δ Income</th>
              <th className="px-3 py-2 text-right">Cost (actual)</th>
              <th className="px-3 py-2 text-right">Bud. cost</th>
              <th className="px-3 py-2 text-right">Δ Cost</th>
              <th className="px-3 py-2 text-right">Δ EBITDA</th>
            </tr>
          </thead>
          <tbody>
            {results.rows.map((r) => (
              <tr key={r.month} className="border-t border-border">
                <td className="px-3 py-1.5 font-medium">
                  {MONTHS[r.month - 1]}
                </td>
                <td className="px-2 py-1">
                  <Input
                    type="number"
                    value={r.actual.customers ?? ""}
                    onChange={(e) =>
                      setField(r.month, "customers", e.target.value)
                    }
                    className="h-7 w-24 rounded-sm border-border bg-background text-right"
                  />
                </td>
                <td className="px-3 py-1.5 text-right text-muted-foreground">
                  {fmtNum(r.budget.customers)}
                </td>
                <td className="px-2 py-1">
                  <Input
                    type="number"
                    value={r.actual.income ?? ""}
                    onChange={(e) =>
                      setField(r.month, "totalIncome", e.target.value)
                    }
                    className="h-7 w-28 rounded-sm border-border bg-background text-right"
                  />
                </td>
                <td className="px-3 py-1.5 text-right text-muted-foreground">
                  {fmtSEK(r.budget.income)}
                </td>
                <td
                  className={`px-3 py-1.5 text-right ${
                    (r.variance.income ?? 0) < 0 ? "num-neg" : ""
                  }`}
                >
                  {r.variance.income != null ? fmtSEK(r.variance.income) : "—"}
                </td>
                <td className="px-2 py-1">
                  <Input
                    type="number"
                    value={r.actual.cost ?? ""}
                    onChange={(e) =>
                      setField(r.month, "totalCost", e.target.value)
                    }
                    className="h-7 w-28 rounded-sm border-border bg-background text-right"
                  />
                </td>
                <td className="px-3 py-1.5 text-right text-muted-foreground">
                  {fmtSEK(r.budget.cost)}
                </td>
                <td
                  className={`px-3 py-1.5 text-right ${
                    (r.variance.cost ?? 0) > 0 ? "num-neg" : ""
                  }`}
                >
                  {r.variance.cost != null ? fmtSEK(r.variance.cost) : "—"}
                </td>
                <td
                  className={`px-3 py-1.5 text-right ${
                    (r.variance.ebitda ?? 0) < 0 ? "num-neg" : ""
                  }`}
                >
                  {r.variance.ebitda != null
                    ? fmtSEK(r.variance.ebitda)
                    : "—"}
                </td>
              </tr>
            ))}
            <tr className="border-t border-border bg-muted/30 font-semibold">
              <td className="px-3 py-2">YTD</td>
              <td className="px-3 py-2 text-right">—</td>
              <td className="px-3 py-2 text-right">—</td>
              <td className="px-3 py-2 text-right">
                {fmtSEK(results.ytdActual.income)}
              </td>
              <td className="px-3 py-2 text-right text-muted-foreground">
                {fmtSEK(results.ytdBudget.income)}
              </td>
              <td
                className={`px-3 py-2 text-right ${
                  deltaIncome < 0 ? "num-neg" : ""
                }`}
              >
                {fmtSEK(deltaIncome)}
              </td>
              <td className="px-3 py-2 text-right">
                {fmtSEK(results.ytdActual.cost)}
              </td>
              <td className="px-3 py-2 text-right text-muted-foreground">
                {fmtSEK(results.ytdBudget.cost)}
              </td>
              <td
                className={`px-3 py-2 text-right ${
                  results.ytdActual.cost - results.ytdBudget.cost > 0
                    ? "num-neg"
                    : ""
                }`}
              >
                {fmtSEK(results.ytdActual.cost - results.ytdBudget.cost)}
              </td>
              <td
                className={`px-3 py-2 text-right ${
                  results.ytdActual.ebitda - results.ytdBudget.ebitda < 0
                    ? "num-neg"
                    : ""
                }`}
              >
                {fmtSEK(results.ytdActual.ebitda - results.ytdBudget.ebitda)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        Leave a cell blank for months not yet reported. Δ uses actual − budget;
        cost variance &gt; 0 = overspent.
      </p>
    </div>
  );
}
