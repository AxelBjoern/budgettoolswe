import { useState } from "react";
import { useActiveScenario, useBudgetStore, useIsLocked } from "@/lib/budget/store";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SlidersHorizontal, RotateCcw, Lock } from "lucide-react";
import type { Assumptions, StreamKey, YearAssumptions } from "@/lib/budget/types";

const YEAR_LABEL = (yi: number, startYear: number) => `Y${yi + 1} (${startYear + yi})`;

export function AssumptionsDrawer() {
  const [open, setOpen] = useState(false);
  const scenario = useActiveScenario();
  const locked = useIsLocked(scenario.id);
  const updateAssumptions = useBudgetStore((s) => s.updateAssumptions);
  const updateYear = useBudgetStore((s) => s.updateYear);
  const resetActive = useBudgetStore((s) => s.resetActive);
  const a = scenario.assumptions;
  const [yi, setYi] = useState(0);
  const y: YearAssumptions = a.perYear[yi];

  const updY = (patch: Partial<YearAssumptions>) =>
    updateYear(scenario.id, yi, patch);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-sm border-border text-xs"
          title="Open assumptions"
        >
          <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
          Assumptions
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[460px] overflow-y-auto sm:max-w-[460px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 font-serif">
            Assumptions
            {locked && (
              <span className="inline-flex items-center gap-1 rounded-sm bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                <Lock className="h-3 w-3" /> Locked
              </span>
            )}
          </SheetTitle>
          <SheetDescription className="text-[11px]">
            {scenario.name} · all edits recompute live and are written to the audit log.
          </SheetDescription>
        </SheetHeader>

        <div className="my-4 flex items-center justify-between gap-2">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Edit year
          </Label>
          <div className="flex flex-wrap gap-1">
            {a.perYear.map((_, i) => (
              <button
                key={i}
                onClick={() => setYi(i)}
                className={`rounded-sm border px-2 py-0.5 text-[10px] tabular-nums ${
                  i === yi
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {a.startYear + i}
              </button>
            ))}
          </div>
        </div>

        <Accordion type="multiple" defaultValue={["growth", "pricing"]} className="space-y-1">
          <Group value="growth" title="Customer growth">
            <Field label="Churn rate" suffix="%" value={y.churnRate * 100} step={0.5}
              onChange={(v) => updY({ churnRate: v / 100 })} locked={locked}/>
            <Field label="CAC" suffix="SEK" value={y.acquisitionCostPerCustomer} step={10}
              onChange={(v) => updY({ acquisitionCostPerCustomer: v })} locked={locked}/>
            <Field label="kWh / customer / yr" value={y.kwhPerCustomerYear} step={500}
              onChange={(v) => updY({ kwhPerCustomerYear: v })} locked={locked}/>
            <Field label="Subscription / yr" suffix="SEK" value={y.subscriptionPerCustomerYear} step={20}
              onChange={(v) => updY({ subscriptionPerCustomerYear: v })} locked={locked}/>
            <Field label="Starting customers" value={y.startingCustomers} step={100}
              onChange={(v) => updY({ startingCustomers: v })} locked={locked}/>
          </Group>

          <Group value="pricing" title="Pricing & margins">
            <Field label="Price / kWh" suffix="SEK" step={0.05} digits={3} value={y.pricePerKwh}
              onChange={(v) => updY({ pricePerKwh: v })} locked={locked}/>
            <Field label="Cost / kWh" suffix="SEK" step={0.05} digits={3} value={y.costPerKwh}
              onChange={(v) => updY({ costPerKwh: v })} locked={locked}/>
            <Field label="Certificate / kWh" suffix="SEK" step={0.005} digits={3} value={y.certificateCostPerKwh}
              onChange={(v) => updY({ certificateCostPerKwh: v })} locked={locked}/>
            <Field label="Surcharge" suffix="%" step={0.5} value={y.surchargePct * 100}
              onChange={(v) => updY({ surchargePct: v / 100 })} locked={locked}/>
            <Field label="Extra svcs / cust / yr" suffix="SEK" value={y.extraServicesPerCustomerYear} step={10}
              onChange={(v) => updY({ extraServicesPerCustomerYear: v })} locked={locked}/>
          </Group>

          <Group value="costs" title="Costs">
            <Field label="Other external (yr)" suffix="SEK" step={50000} value={y.otherExternalExpenses}
              onChange={(v) => updY({ otherExternalExpenses: v })} locked={locked}/>
            <Field label="Invoicing / cust" suffix="SEK" step={1} value={y.invoicingCostPerCustomer}
              onChange={(v) => updY({ invoicingCostPerCustomer: v })} locked={locked}/>
            <Field label="Social fees" suffix="%" step={0.1} value={y.socialFeesPct * 100}
              onChange={(v) => updY({ socialFeesPct: v / 100 })} locked={locked}/>
            <Field label="Loan interest (yr)" suffix="SEK" step={10000} value={y.loanInterest}
              onChange={(v) => updY({ loanInterest: v })} locked={locked}/>
          </Group>

          <Group value="streams" title="Solar / Battery / VPP / SaaS">
            {(["solar", "battery", "vpp", "saas"] as StreamKey[]).map((sk) => {
              const s = y.streams?.[sk];
              if (!s) return null;
              return (
                <div key={sk} className="rounded-sm border border-border p-2">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-xs font-semibold capitalize">{sk}</div>
                    <Switch
                      checked={s.enabled}
                      onCheckedChange={(v) =>
                        updY({
                          streams: {
                            ...(y.streams ?? {} as any),
                            [sk]: { ...s, enabled: v },
                          } as any,
                        })
                      }
                      disabled={locked}
                    />
                  </div>
                  <Field label="New units / yr" value={s.newUnitsPerYear} step={10}
                    onChange={(v) => updY({ streams: { ...(y.streams as any), [sk]: { ...s, newUnitsPerYear: v } } as any })}
                    locked={locked || !s.enabled}/>
                  <Field label="One-time rev / unit" suffix="SEK" value={s.oneTimeRevenuePerUnit} step={1000}
                    onChange={(v) => updY({ streams: { ...(y.streams as any), [sk]: { ...s, oneTimeRevenuePerUnit: v } } as any })}
                    locked={locked || !s.enabled}/>
                  <Field label="One-time COGS" suffix="%" value={s.oneTimeCogsPct * 100} step={1}
                    onChange={(v) => updY({ streams: { ...(y.streams as any), [sk]: { ...s, oneTimeCogsPct: v / 100 } } as any })}
                    locked={locked || !s.enabled}/>
                  <Field label="Recurring / unit / mo" suffix="SEK" value={s.recurringMonthlyPerUnit} step={10}
                    onChange={(v) => updY({ streams: { ...(y.streams as any), [sk]: { ...s, recurringMonthlyPerUnit: v } } as any })}
                    locked={locked || !s.enabled}/>
                  <Field label="Recurring COGS" suffix="%" value={s.recurringCogsPct * 100} step={1}
                    onChange={(v) => updY({ streams: { ...(y.streams as any), [sk]: { ...s, recurringCogsPct: v / 100 } } as any })}
                    locked={locked || !s.enabled}/>
                  <Field label="Annual churn" suffix="%" value={s.annualChurnPct * 100} step={0.5}
                    onChange={(v) => updY({ streams: { ...(y.streams as any), [sk]: { ...s, annualChurnPct: v / 100 } } as any })}
                    locked={locked || !s.enabled}/>
                </div>
              );
            })}
          </Group>

          <Group value="financing" title="Financing portfolio">
            <FinField label="Enabled" toggle value={a.financing?.enabled ?? false}
              onToggle={(v) => updateAssumptions(scenario.id, { financing: { ...(a.financing as any), enabled: v } })}
              locked={locked}/>
            <Field label="Avg principal" suffix="SEK" value={a.financing?.avgPrincipal ?? 0} step={1000}
              onChange={(v) => updateAssumptions(scenario.id, { financing: { ...(a.financing as any), avgPrincipal: v } })}
              locked={locked}/>
            <Field label="Term" suffix="months" value={a.financing?.termMonths ?? 120} step={12}
              onChange={(v) => updateAssumptions(scenario.id, { financing: { ...(a.financing as any), termMonths: v } })}
              locked={locked}/>
            <Field label="Customer APR" suffix="%" value={(a.financing?.customerAPR ?? 0) * 100} step={0.25} digits={2}
              onChange={(v) => updateAssumptions(scenario.id, { financing: { ...(a.financing as any), customerAPR: v / 100 } })}
              locked={locked}/>
            <Field label="Origination fee" suffix="%" value={(a.financing?.originationFeePct ?? 0) * 100} step={0.25} digits={2}
              onChange={(v) => updateAssumptions(scenario.id, { financing: { ...(a.financing as any), originationFeePct: v / 100 } })}
              locked={locked}/>
            <Field label="Cost of capital" suffix="%" value={(a.financing?.costOfCapitalPct ?? 0) * 100} step={0.25} digits={2}
              onChange={(v) => updateAssumptions(scenario.id, { financing: { ...(a.financing as any), costOfCapitalPct: v / 100 } })}
              locked={locked}/>
            <Field label="Default rate (yr)" suffix="%" value={(a.financing?.defaultAnnualPct ?? 0) * 100} step={0.1} digits={2}
              onChange={(v) => updateAssumptions(scenario.id, { financing: { ...(a.financing as any), defaultAnnualPct: v / 100 } })}
              locked={locked}/>
            <Field label="Recovery" suffix="%" value={(a.financing?.recoveryPct ?? 0) * 100} step={1}
              onChange={(v) => updateAssumptions(scenario.id, { financing: { ...(a.financing as any), recoveryPct: v / 100 } })}
              locked={locked}/>
            <Field label={`Originations Y${yi + 1}`} value={a.financing?.originationsPerYear?.[yi] ?? 0} step={10}
              onChange={(v) => {
                const arr = [...(a.financing?.originationsPerYear ?? [])];
                arr[yi] = v;
                updateAssumptions(scenario.id, { financing: { ...(a.financing as any), originationsPerYear: arr } });
              }}
              locked={locked}/>
          </Group>

          <Group value="wc" title="Working capital & tax">
            <Field label="DSO" suffix="days" value={a.dso ?? 30} step={1}
              onChange={(v) => updateAssumptions(scenario.id, { dso: v })} locked={locked}/>
            <Field label="DPO" suffix="days" value={a.dpo ?? 30} step={1}
              onChange={(v) => updateAssumptions(scenario.id, { dpo: v })} locked={locked}/>
            <Field label="Tax rate" suffix="%" value={(a.taxRate ?? 0) * 100} step={0.5}
              onChange={(v) => updateAssumptions(scenario.id, { taxRate: v / 100 })} locked={locked}/>
            <Field label="Depreciation" suffix="yrs" value={a.depreciationYears ?? 5} step={1}
              onChange={(v) => updateAssumptions(scenario.id, { depreciationYears: v })} locked={locked}/>
            <Field label="VAT rate" suffix="%" value={a.vatRate * 100} step={0.5}
              onChange={(v) => updateAssumptions(scenario.id, { vatRate: v / 100 })} locked={locked}/>
            <Field label="Sales appreciation" suffix="%/yr" value={(a.salesAppreciationPct ?? 0) * 100} step={0.5}
              onChange={(v) => updateAssumptions(scenario.id, { salesAppreciationPct: v / 100 })} locked={locked}/>
          </Group>

          <Group value="opening" title="Opening balance sheet">
            {(["cash", "accountsReceivable", "accountsPayable", "fixedAssets", "debt", "equity"] as const).map((k) => (
              <Field key={k} label={k} suffix="SEK" step={50000} value={(a.opening as any)?.[k] ?? 0}
                onChange={(v) => updateAssumptions(scenario.id, { opening: { ...(a.opening as any), [k]: v } })}
                locked={locked}/>
            ))}
          </Group>
        </Accordion>

        <div className="sticky bottom-0 mt-4 flex items-center justify-between gap-2 border-t border-border bg-background pt-3">
          <Button
            variant="outline"
            size="sm"
            className="rounded-sm text-xs"
            onClick={() => {
              if (locked) return;
              if (confirm("Reset all assumptions for this scenario to defaults?"))
                resetActive();
            }}
            disabled={locked}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset to defaults
          </Button>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {YEAR_LABEL(yi, a.startYear)}
          </span>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Group({
  value,
  title,
  children,
}: {
  value: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <AccordionItem value={value} className="rounded-sm border border-border">
      <AccordionTrigger className="px-3 py-2 text-xs font-semibold uppercase tracking-wider hover:no-underline">
        {title}
      </AccordionTrigger>
      <AccordionContent className="space-y-1.5 px-3 pb-3">
        {children}
      </AccordionContent>
    </AccordionItem>
  );
}

function Field({
  label,
  value,
  onChange,
  step = 1,
  digits = 2,
  suffix,
  locked,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  digits?: number;
  suffix?: string;
  locked?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <Label className="flex-1 text-muted-foreground">{label}</Label>
      <Input
        type="number"
        step={step}
        value={Number.isFinite(value) ? Number(value.toFixed(digits)) : 0}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        disabled={locked}
        className="h-7 w-[110px] rounded-sm border-border bg-background text-right text-xs tabular-nums"
      />
      {suffix && (
        <span className="w-12 text-right text-[10px] uppercase tracking-wider text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  );
}

function FinField({
  label,
  toggle,
  value,
  onToggle,
  locked,
}: {
  label: string;
  toggle: true;
  value: boolean;
  onToggle: (v: boolean) => void;
  locked?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <Label className="flex-1 text-muted-foreground">{label}</Label>
      <Switch checked={value} onCheckedChange={onToggle} disabled={locked} />
      <span className="w-12" />
    </div>
  );
}
