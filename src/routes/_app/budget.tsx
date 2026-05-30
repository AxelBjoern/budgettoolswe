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
              All to 0
            </Button>
            <SyncFromEnergyDialog
              scenarioId={scenario.id}
              years={scenario.assumptions.perYear.length}
              updateYear={updateYear}
              currentShare={ya.priceAreaShare}
            />
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
            <div className="mb-3 flex items-center gap-3 border-b border-border pb-3">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Sales start month
              </Label>
              <select
                value={ya.salesStartMonth ?? 1}
                onChange={(e) =>
                  patch({ salesStartMonth: Number(e.target.value) })
                }
                className="h-8 rounded-sm border border-border bg-background px-2 text-xs tabular-nums"
              >
                {[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => (
                  <option key={m} value={m}>
                    {new Date(2000, m - 1, 1).toLocaleString("en", { month: "short" })} ({m})
                  </option>
                ))}
              </select>
              <span className="text-xs text-muted-foreground">
                New customers and acquisition cost start in this month of {yearLabel}.
              </span>
            </div>
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
                    <th className="px-3 py-2 text-center">Start (YYYY-MM)</th>
                    <th className="px-3 py-2 text-center">End (YYYY-MM)</th>
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
                      <td className="px-3 py-1.5 text-center">
                        <Input
                          type="month"
                          value={
                            r.startYear
                              ? `${r.startYear}-${String(r.startMonth ?? 1).padStart(2, "0")}`
                              : ""
                          }
                          onChange={(e) => {
                            const v = e.target.value;
                            const salaries = [...ya.salaries];
                            if (!v) {
                              const { startYear: _y, startMonth: _m, ...rest } = r;
                              void _y; void _m;
                              salaries[i] = rest;
                            } else {
                              const [Y, M] = v.split("-");
                              salaries[i] = { ...r, startYear: Number(Y), startMonth: Number(M) };
                            }
                            patch({ salaries });
                          }}
                          className="h-7 w-[130px] rounded-sm border-border bg-background text-xs"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <Input
                          type="month"
                          value={
                            r.endYear
                              ? `${r.endYear}-${String(r.endMonth ?? 12).padStart(2, "0")}`
                              : ""
                          }
                          onChange={(e) => {
                            const v = e.target.value;
                            const salaries = [...ya.salaries];
                            if (!v) {
                              const { endYear: _y, endMonth: _m, ...rest } = r;
                              void _y; void _m;
                              salaries[i] = rest;
                            } else {
                              const [Y, M] = v.split("-");
                              salaries[i] = { ...r, endYear: Number(Y), endMonth: Number(M) };
                            }
                            patch({ salaries });
                          }}
                          className="h-7 w-[130px] rounded-sm border-border bg-background text-xs"
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
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2 text-right">
                      {fmtSEK(yr.salaryCost)}
                    </td>
                  </tr>
                </tbody>

              </table>
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="areas" className="mt-4 space-y-4">
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

          <Panel title="Per-area pricing (Energy system sync)">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <div className="text-sm font-medium">Use per-area pricing</div>
                <p className="text-xs text-muted-foreground">
                  When on, the engine derives revenue and cost from each zone's öre/kWh
                  values instead of the global Pricing tab.
                </p>
              </div>
              <Switch
                checked={!!ya.useAreaPricing}
                onCheckedChange={(v) => patch({ useAreaPricing: v })}
              />
            </div>
            <AreaPricingTable
              ya={ya}
              disabled={!ya.useAreaPricing}
              onChange={(k, p) =>
                patch({
                  priceAreaPricing: {
                    ...(ya.priceAreaPricing ?? {
                      SE1: { avgPurchaseOre: 0, pslagOre: 0, elcertOre: 0 },
                      SE2: { avgPurchaseOre: 0, pslagOre: 0, elcertOre: 0 },
                      SE3: { avgPurchaseOre: 0, pslagOre: 0, elcertOre: 0 },
                      SE4: { avgPurchaseOre: 0, pslagOre: 0, elcertOre: 0 },
                    }),
                    [k]: p,
                  },
                })
              }
            />
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AreaPricingTable({
  ya,
  disabled,
  onChange,
}: {
  ya: import("@/lib/budget/types").YearAssumptions;
  disabled?: boolean;
  onChange: (k: PriceAreaKey, p: AreaPricing) => void;
}) {
  const pricing = ya.priceAreaPricing ?? {
    SE1: { avgPurchaseOre: 0, pslagOre: 0, elcertOre: 0 },
    SE2: { avgPurchaseOre: 0, pslagOre: 0, elcertOre: 0 },
    SE3: { avgPurchaseOre: 0, pslagOre: 0, elcertOre: 0 },
    SE4: { avgPurchaseOre: 0, pslagOre: 0, elcertOre: 0 },
  };
  const weightedSell =
    AREAS.reduce((a, k) => {
      const p = pricing[k];
      return a + ya.priceAreaShare[k] * (p.avgPurchaseOre + p.pslagOre);
    }, 0);
  const weightedCost = AREAS.reduce(
    (a, k) => a + ya.priceAreaShare[k] * pricing[k].avgPurchaseOre,
    0,
  );
  return (
    <div className={`overflow-x-auto rounded-sm border border-border ${disabled ? "opacity-60" : ""}`}>
      <table className="w-full text-sm tabular-nums">
        <thead className="bg-muted/60 text-[10px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left">Zone</th>
            <th className="px-3 py-2 text-right">Avg öre/kWh</th>
            <th className="px-3 py-2 text-right">Påslag öre/kWh</th>
            <th className="px-3 py-2 text-right">Elcert öre/kWh</th>
            <th className="px-3 py-2 text-right">Total öre/kWh</th>
            <th className="px-3 py-2 text-right">SEK/kWh</th>
          </tr>
        </thead>
        <tbody>
          {AREAS.map((k) => {
            const p = pricing[k];
            const total = p.avgPurchaseOre + p.pslagOre;
            return (
              <tr key={k} className="border-t border-border">
                <td className="px-3 py-1.5 font-medium">{k}</td>
                <td className="px-3 py-1.5">
                  <Input
                    type="number"
                    step={0.001}
                    disabled={disabled}
                    value={p.avgPurchaseOre}
                    onChange={(e) =>
                      onChange(k, { ...p, avgPurchaseOre: Number(e.target.value) })
                    }
                    className="h-7 w-28 rounded-sm border-border bg-background text-right"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <Input
                    type="number"
                    step={0.001}
                    disabled={disabled}
                    value={p.pslagOre}
                    onChange={(e) =>
                      onChange(k, { ...p, pslagOre: Number(e.target.value) })
                    }
                    className="h-7 w-28 rounded-sm border-border bg-background text-right"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <Input
                    type="number"
                    step={0.001}
                    disabled={disabled}
                    value={p.elcertOre}
                    onChange={(e) =>
                      onChange(k, { ...p, elcertOre: Number(e.target.value) })
                    }
                    className="h-7 w-28 rounded-sm border-border bg-background text-right"
                  />
                </td>
                <td className="px-3 py-1.5 text-right">{total.toFixed(2)}</td>
                <td className="px-3 py-1.5 text-right text-muted-foreground">
                  {fmtSekPerKwh(total / 100)}
                </td>
              </tr>
            );
          })}
          <tr className="border-t border-border bg-muted/30 font-semibold">
            <td className="px-3 py-2">Snitt (vägt)</td>
            <td className="px-3 py-2 text-right">{weightedCost.toFixed(2)}</td>
            <td className="px-3 py-2 text-right">—</td>
            <td className="px-3 py-2 text-right">—</td>
            <td className="px-3 py-2 text-right">{weightedSell.toFixed(2)}</td>
            <td className="px-3 py-2 text-right">{fmtSekPerKwh(weightedSell / 100)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function SyncFromEnergyDialog({
  scenarioId,
  years,
  updateYear,
  currentShare,
}: {
  scenarioId: string;
  years: number;
  updateYear: (id: string, idx: number, patch: Partial<import("@/lib/budget/types").YearAssumptions>) => void;
  currentShare: Record<PriceAreaKey, number>;
}) {
  const [open, setOpen] = useState(false);
  const [json, setJson] = useState("");
  const [applyAll, setApplyAll] = useState(true);
  const [updateShare, setUpdateShare] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = () => {
    setError(null);
    try {
      const raw = JSON.parse(json);
      if (!Array.isArray(raw)) throw new Error("Expected an array of zone rows");
      const pricing: Record<PriceAreaKey, AreaPricing> = {
        SE1: { avgPurchaseOre: 0, pslagOre: 0, elcertOre: 0 },
        SE2: { avgPurchaseOre: 0, pslagOre: 0, elcertOre: 0 },
        SE3: { avgPurchaseOre: 0, pslagOre: 0, elcertOre: 0 },
        SE4: { avgPurchaseOre: 0, pslagOre: 0, elcertOre: 0 },
      };
      const volumes: Record<PriceAreaKey, number> = { SE1: 0, SE2: 0, SE3: 0, SE4: 0 };
      for (const row of raw) {
        const zone = String(row.zone || row.price_area || "").toUpperCase() as PriceAreaKey;
        if (!AREAS.includes(zone)) continue;
        pricing[zone] = {
          avgPurchaseOre: Number(row.avg_purchase_price_per_mwh ?? 0) / 10,
          pslagOre: Number(row.pslag_per_mwh ?? 0) / 10,
          elcertOre: Number(row.elcert_per_mwh ?? 0) / 10,
        };
        volumes[zone] = Number(row.volume_mwh ?? 0);
      }

      let shareUpdate: Record<PriceAreaKey, number> | undefined;
      if (updateShare) {
        const total = AREAS.reduce((a, k) => a + volumes[k], 0);
        if (total > 0) {
          shareUpdate = {
            SE1: volumes.SE1 / total,
            SE2: volumes.SE2 / total,
            SE3: volumes.SE3 / total,
            SE4: volumes.SE4 / total,
          };
        }
      }

      const patch: Partial<import("@/lib/budget/types").YearAssumptions> = {
        priceAreaPricing: pricing,
        useAreaPricing: true,
        ...(shareUpdate ? { priceAreaShare: shareUpdate } : {}),
      };

      const range = applyAll ? Array.from({ length: years }, (_, i) => i) : [0];
      for (const i of range) updateYear(scenarioId, i, patch);
      setOpen(false);
      setJson("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 rounded-sm">
          <RefreshCw className="mr-1 h-3.5 w-3.5" />
          Sync from Energy system
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sync pricing from Energy system</DialogTitle>
          <DialogDescription>
            Paste the JSON returned by <code>listManagedZonePrices</code> — one row per
            zone with <code>avg_purchase_price_per_mwh</code>, <code>pslag_per_mwh</code>,{" "}
            <code>elcert_per_mwh</code>, <code>volume_mwh</code>. Values are converted to
            öre/kWh.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          rows={10}
          placeholder='[{"zone":"SE3","avg_purchase_price_per_mwh":580,"pslag_per_mwh":100,"elcert_per_mwh":45,"volume_mwh":1200}, …]'
          value={json}
          onChange={(e) => setJson(e.target.value)}
          className="font-mono text-xs"
        />
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={applyAll} onCheckedChange={(v) => setApplyAll(!!v)} />
            Apply to all years
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={updateShare} onCheckedChange={(v) => setUpdateShare(!!v)} />
            Also update area volume share from <code>volume_mwh</code>
          </label>
          <p className="text-xs text-muted-foreground">
            Current share: SE1 {(currentShare.SE1 * 100).toFixed(0)}% · SE2{" "}
            {(currentShare.SE2 * 100).toFixed(0)}% · SE3 {(currentShare.SE3 * 100).toFixed(0)}%
            · SE4 {(currentShare.SE4 * 100).toFixed(0)}%
          </p>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={apply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
