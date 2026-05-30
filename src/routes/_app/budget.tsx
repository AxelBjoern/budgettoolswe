import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useActiveScenario, useBudgetStore } from "@/lib/budget/store";
import { compute } from "@/lib/budget/engine";
import { SectionHeader } from "@/components/budget/SectionHeader";
import { KpiCard } from "@/components/budget/KpiCard";
import { fmtSEK, fmtNum, fmtPct } from "@/lib/budget/format";
import { CHANNELS, type ChannelKey, type PriceAreaKey } from "@/lib/budget/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RotateCcw, Download, RefreshCw } from "lucide-react";
import { useMemo } from "react";
import { fmtSekPerKwh } from "@/lib/budget/format";
import type { AreaPricing } from "@/lib/budget/types";

export const Route = createFileRoute("/_app/budget")({
  head: () => ({
    meta: [
      { title: "Budget tool — Nordenergi" },
      { name: "description", content: "Edit forecast assumptions and recompute the budget live." },
    ],
  }),
  component: BudgetTool,
});

const AREAS: PriceAreaKey[] = ["SE1", "SE2", "SE3", "SE4"];

function BudgetTool() {
  const scenario = useActiveScenario();
  const updateYear = useBudgetStore((s) => s.updateYear);
  const resetActive = useBudgetStore((s) => s.resetActive);
  const [yearIdx, setYearIdx] = useState(0);

  const ya = scenario.assumptions.perYear[yearIdx];
  const yearLabel = scenario.assumptions.startYear + yearIdx;

  const model = useMemo(() => compute(scenario.assumptions), [scenario]);
  const yr = model.yearly[yearIdx];

  const patch = (p: Partial<typeof ya>) =>
    updateYear(scenario.id, yearIdx, p);

  const patchChannel = (k: ChannelKey, v: number) =>
    patch({ newCustomersByChannel: { ...ya.newCustomersByChannel, [k]: v } });

  const patchArea = (k: PriceAreaKey, v: number) =>
    patch({ priceAreaShare: { ...ya.priceAreaShare, [k]: v } });

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(scenario, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${scenario.name.toLowerCase()}-budget.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Budget assumptions"
        subtitle={`Scenario · ${scenario.name}`}
      right={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportJson} className="h-8 rounded-sm">
              <Download className="mr-1 h-3.5 w-3.5" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm("Reset this scenario to seed values?")) resetActive();
              }}
              className="h-8 rounded-sm"
            >
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              Reset
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!confirm("Set every numeric assumption to 1 across all years?")) return;
                const one: typeof ya = {
                  newCustomersByChannel: Object.fromEntries(CHANNELS.map((c) => [c.key, 1])) as Record<ChannelKey, number>,
                  churnRate: 1,
                  acquisitionCostPerCustomer: 1,
                  kwhPerCustomerYear: 1,
                  subscriptionPerCustomerYear: 1,
                  pricePerKwh: 1,
                  costPerKwh: 1,
                  certificateCostPerKwh: 1,
                  surchargePct: 1,
                  extraServicesPerCustomerYear: 1,
                  otherExternalExpenses: 1,
                  socialFeesPct: 1,
                  loanInterest: 1,
                  invoicingCostPerCustomer: 1,
                  salaries: ya.salaries.map((r) => ({ ...r, title: r.title, count: 1, monthlySalary: 1 })),
                  priceAreaShare: { SE1: 1, SE2: 1, SE3: 1, SE4: 1 },
                  startingCustomers: 1,
                  priceAreaPricing: {
                    SE1: { avgPurchaseOre: 1, pslagOre: 1, elcertOre: 1 },
                    SE2: { avgPurchaseOre: 1, pslagOre: 1, elcertOre: 1 },
                    SE3: { avgPurchaseOre: 1, pslagOre: 1, elcertOre: 1 },
                    SE4: { avgPurchaseOre: 1, pslagOre: 1, elcertOre: 1 },
                  },
                  useAreaPricing: ya.useAreaPricing ?? false,
                };
                for (let i = 0; i < scenario.assumptions.perYear.length; i++) {
                  updateYear(scenario.id, i, one);
                }
              }}
              className="h-8 rounded-sm"
            >
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              All to 1
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-1 border-b border-border pb-2">
        <span className="mr-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          Edit year
        </span>
        {scenario.assumptions.perYear.map((_, i) => {
          const y = scenario.assumptions.startYear + i;
          return (
            <button
              key={y}
              onClick={() => setYearIdx(i)}
              className={`rounded-sm px-3 py-1 text-xs font-medium tabular-nums ${
                i === yearIdx
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {y}
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label={`${yearLabel} customers`} value={fmtNum(yr.endingCustomers)} />
        <KpiCard label="Turnover" value={fmtSEK(yr.totalIncome, { compact: true })} />
        <KpiCard label="EBITDA" value={fmtSEK(yr.ebitda, { compact: true })} tone={yr.ebitda >= 0 ? "positive" : "negative"} />
        <KpiCard label="Cash flow" value={fmtSEK(yr.cashFlow, { compact: true })} tone={yr.cashFlow >= 0 ? "positive" : "negative"} />
      </div>

      <Tabs defaultValue="customers" className="w-full">
        <TabsList className="rounded-sm">
          <TabsTrigger value="customers" className="rounded-sm text-xs uppercase tracking-wider">Customers</TabsTrigger>
          <TabsTrigger value="pricing" className="rounded-sm text-xs uppercase tracking-wider">Pricing</TabsTrigger>
          <TabsTrigger value="costs" className="rounded-sm text-xs uppercase tracking-wider">Costs</TabsTrigger>
          <TabsTrigger value="salaries" className="rounded-sm text-xs uppercase tracking-wider">Salaries</TabsTrigger>
          <TabsTrigger value="areas" className="rounded-sm text-xs uppercase tracking-wider">Price areas</TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="mt-4">
          <Panel title="Acquisition by channel">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {CHANNELS.map((c) => (
                <FieldNum
                  key={c.key}
                  label={c.label}
                  value={ya.newCustomersByChannel[c.key]}
                  onChange={(v) => patchChannel(c.key, v)}
                />
              ))}
              <FieldNum
                label="Acquisition cost / customer (SEK)"
                value={ya.acquisitionCostPerCustomer}
                onChange={(v) => patch({ acquisitionCostPerCustomer: v })}
              />
              <FieldNum
                label="Annual churn (%)"
                value={ya.churnRate * 100}
                step={0.5}
                onChange={(v) => patch({ churnRate: v / 100 })}
              />
              {yearIdx === 0 && (
                <FieldNum
                  label="Starting customers"
                  value={ya.startingCustomers}
                  onChange={(v) => patch({ startingCustomers: v })}
                />
              )}
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="pricing" className="mt-4">
          <Panel title="Energy pricing">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <FieldNum label="Avg consumption (kWh/customer/yr)" value={ya.kwhPerCustomerYear} onChange={(v) => patch({ kwhPerCustomerYear: v })} />
              <FieldNum label="Subscription SEK/customer/yr" value={ya.subscriptionPerCustomerYear} onChange={(v) => patch({ subscriptionPerCustomerYear: v })} />
              <FieldNum label="Price per kWh (SEK)" value={ya.pricePerKwh} step={0.01} onChange={(v) => patch({ pricePerKwh: v })} />
              <FieldNum label="Cost per kWh (SEK)" value={ya.costPerKwh} step={0.01} onChange={(v) => patch({ costPerKwh: v })} />
              <FieldNum label="Certificate cost per kWh (SEK)" value={ya.certificateCostPerKwh} step={0.001} onChange={(v) => patch({ certificateCostPerKwh: v })} />
              <FieldNum label="Surcharge (%)" value={ya.surchargePct * 100} step={0.1} onChange={(v) => patch({ surchargePct: v / 100 })} />
              <FieldNum label="Extra services profit SEK/customer/yr" value={ya.extraServicesPerCustomerYear} onChange={(v) => patch({ extraServicesPerCustomerYear: v })} />
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="costs" className="mt-4">
          <Panel title="Other costs">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <FieldNum label="Other external expenses (SEK/yr)" value={ya.otherExternalExpenses} onChange={(v) => patch({ otherExternalExpenses: v })} />
              <FieldNum label="Invoicing cost SEK/customer/yr" value={ya.invoicingCostPerCustomer} onChange={(v) => patch({ invoicingCostPerCustomer: v })} />
              <FieldNum label="Loan interest (SEK/yr)" value={ya.loanInterest} onChange={(v) => patch({ loanInterest: v })} />
              <FieldNum label="Social fees (%)" value={ya.socialFeesPct * 100} step={0.1} onChange={(v) => patch({ socialFeesPct: v / 100 })} />
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="salaries" className="mt-4">
          <Panel title="Salary roster">
            <div className="overflow-x-auto rounded-sm border border-border">
              <table className="w-full text-sm tabular-nums">
                <thead className="bg-muted/60 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Role</th>
                    <th className="px-3 py-2 text-right">Headcount</th>
                    <th className="px-3 py-2 text-right">Monthly SEK</th>
                    <th className="px-3 py-2 text-right">Yearly (incl. social)</th>
                  </tr>
                </thead>
                <tbody>
                  {ya.salaries.map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-1.5">
                        <Input
                          value={r.title}
                          onChange={(e) => {
                            const salaries = [...ya.salaries];
                            salaries[i] = { ...r, title: e.target.value };
                            patch({ salaries });
                          }}
                          className="h-7 rounded-sm border-border bg-background"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          type="number"
                          value={r.count}
                          onChange={(e) => {
                            const salaries = [...ya.salaries];
                            salaries[i] = { ...r, count: Number(e.target.value) };
                            patch({ salaries });
                          }}
                          className="h-7 w-24 rounded-sm border-border bg-background text-right"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          type="number"
                          value={r.monthlySalary}
                          onChange={(e) => {
                            const salaries = [...ya.salaries];
                            salaries[i] = { ...r, monthlySalary: Number(e.target.value) };
                            patch({ salaries });
                          }}
                          className="h-7 w-32 rounded-sm border-border bg-background text-right"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right text-muted-foreground">
                        {fmtSEK(r.count * r.monthlySalary * 12 * (1 + ya.socialFeesPct))}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-border bg-muted/30 font-semibold">
                    <td className="px-3 py-2">Total</td>
                    <td className="px-3 py-2 text-right">
                      {ya.salaries.reduce((a, b) => a + b.count, 0)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {fmtSEK(ya.salaries.reduce((a, b) => a + b.count * b.monthlySalary, 0))}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {fmtSEK(yr.salaryCost)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="areas" className="mt-4">
          <Panel title="Price area volume share (SE1–SE4)">
            <div className="grid gap-3 sm:grid-cols-4">
              {AREAS.map((k) => (
                <FieldNum
                  key={k}
                  label={`${k} share (%)`}
                  value={ya.priceAreaShare[k] * 100}
                  step={0.5}
                  onChange={(v) => patchArea(k, v / 100)}
                />
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Current sum: {fmtPct(AREAS.reduce((a, k) => a + ya.priceAreaShare[k], 0), 1)}
            </p>
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-sm border border-border bg-card p-4">
      <h3 className="mb-3 border-b border-border pb-2 font-serif text-base font-bold">
        {title}
      </h3>
      {children}
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
