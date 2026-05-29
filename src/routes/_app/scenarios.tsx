import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useBudgetStore } from "@/lib/budget/store";
import { compute } from "@/lib/budget/engine";
import { SectionHeader } from "@/components/budget/SectionHeader";
import { fmtSEK, fmtNum, fmtPct } from "@/lib/budget/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Copy } from "lucide-react";

export const Route = createFileRoute("/_app/scenarios")({
  head: () => ({
    meta: [
      { title: "Scenarios — Nordenergi Budget" },
      { name: "description", content: "Compare budget scenarios side by side." },
    ],
  }),
  component: ScenariosPage,
});

function ScenariosPage() {
  const scenarios = useBudgetStore((s) => s.scenarios);
  const add = useBudgetStore((s) => s.addScenario);
  const del = useBudgetStore((s) => s.deleteScenario);
  const rename = useBudgetStore((s) => s.renameScenario);
  const setActive = useBudgetStore((s) => s.setActiveScenario);
  const [newName, setNewName] = useState("");

  const computed = useMemo(
    () =>
      scenarios.map((sc) => ({
        scenario: sc,
        model: compute(sc.assumptions),
      })),
    [scenarios],
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Scenarios"
        subtitle="Side-by-side comparison"
        right={
          <div className="flex items-center gap-2">
            <Input
              placeholder="New scenario name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="h-8 w-48 rounded-sm border-border bg-background text-xs"
            />
            <Button
              size="sm"
              className="h-8 rounded-sm bg-primary text-primary-foreground"
              onClick={() => {
                if (!newName.trim()) return;
                add(newName.trim());
                setNewName("");
              }}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add
            </Button>
          </div>
        }
      />

      <div className="overflow-x-auto rounded-sm border border-border">
        <table className="w-full text-xs tabular-nums">
          <thead className="bg-muted/60 text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Scenario</th>
              <th className="px-3 py-2 text-right">EoH customers</th>
              <th className="px-3 py-2 text-right">Total income</th>
              <th className="px-3 py-2 text-right">Total cost</th>
              <th className="px-3 py-2 text-right">EBITDA</th>
              <th className="px-3 py-2 text-right">Cash flow</th>
              <th className="px-3 py-2 text-right">Avg churn</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {computed.map(({ scenario, model }) => {
              const totals = model.yearly.reduce(
                (a, y) => ({
                  income: a.income + y.totalIncome,
                  cost: a.cost + y.totalCost,
                  ebitda: a.ebitda + y.ebitda,
                  cash: a.cash + y.cashFlow,
                  churn: a.churn + y.churnRate,
                }),
                { income: 0, cost: 0, ebitda: 0, cash: 0, churn: 0 },
              );
              const last = model.yearly[model.yearly.length - 1];
              return (
                <tr key={scenario.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <Input
                      value={scenario.name}
                      onChange={(e) => rename(scenario.id, e.target.value)}
                      className="h-7 w-44 rounded-sm border-border bg-background"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">{fmtNum(last.endingCustomers)}</td>
                  <td className="px-3 py-2 text-right">{fmtSEK(totals.income, { compact: true })}</td>
                  <td className="px-3 py-2 text-right">{fmtSEK(totals.cost, { compact: true })}</td>
                  <td className={`px-3 py-2 text-right ${totals.ebitda < 0 ? "num-neg" : ""}`}>
                    {fmtSEK(totals.ebitda, { compact: true })}
                  </td>
                  <td className={`px-3 py-2 text-right ${totals.cash < 0 ? "num-neg" : ""}`}>
                    {fmtSEK(totals.cash, { compact: true })}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {fmtPct(totals.churn / model.yearly.length)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 rounded-sm px-2"
                        onClick={() => setActive(scenario.id)}
                      >
                        Use
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 rounded-sm px-2"
                        onClick={() => add(`${scenario.name} copy`, scenario.id)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 rounded-sm px-2 text-destructive"
                        disabled={scenarios.length <= 1}
                        onClick={() => {
                          if (confirm(`Delete scenario "${scenario.name}"?`)) {
                            del(scenario.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Edit assumptions for a scenario from the <strong>Budget</strong> tab after switching to it with <em>Use</em>.
      </p>
    </div>
  );
}
