import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FileSpreadsheet, FileText, Presentation, Loader2, Printer, AlertTriangle } from "lucide-react";
import { useActiveScenario } from "@/lib/budget/store";
import { compute, buildStatements } from "@/lib/budget/engine";
import {
  buildBoardContext,
  exportExcel,
  exportPDF,
  exportPPTX,
} from "@/lib/budget/exports";
import { buildSensitivity } from "@/lib/budget/sensitivity";
import { SectionHeader } from "@/components/budget/SectionHeader";
import { KpiCard } from "@/components/budget/KpiCard";
import { Button } from "@/components/ui/button";
import { fmtSEK, fmtNum, fmtPct } from "@/lib/budget/format";
import { EbitdaWaterfall, FinancingBridge } from "@/components/budget/BridgeCharts";
import { useBudgetStore } from "@/lib/budget/store";


export const Route = createFileRoute("/_app/board")({
  head: () => ({
    meta: [
      { title: "Board Pack — Nordenergi Budget" },
      {
        name: "description",
        content:
          "10-year horizon board pack with KPI summary, charts, and Excel / PDF / PPTX exports.",
      },
    ],
  }),
  component: BoardPage,
});

function BoardPage() {
  const scenario = useActiveScenario();
  const model = useMemo(() => compute(scenario.assumptions), [scenario]);
  const ctx = useMemo(
    () => buildBoardContext(scenario.name, scenario.assumptions, model),
    [scenario, model],
  );
  const [busy, setBusy] = useState<"xlsx" | "pdf" | "pptx" | null>(null);

  const selectedYear = useBudgetStore((s) => s.selectedYear);
  const bridgeYear =
    model.yearly.find((y) => y.year === selectedYear) ?? model.yearly[model.yearly.length - 1];

  const lastCF = model.statements.cashFlow[model.statements.cashFlow.length - 1];
  const cumulativeCFO = model.statements.cashFlow.reduce((a, r) => a + r.cfo, 0);
  const horizon = {
    revenue: model.yearly.reduce((a, y) => a + y.totalIncome, 0),
    ebitda: model.yearly.reduce((a, y) => a + y.ebitda, 0),
    cash: model.yearly.reduce((a, y) => a + y.cashFlow, 0),
    endCustomers: model.yearly[model.yearly.length - 1].endingCustomers,
    streamRev: model.yearly.reduce((a, y) => a + y.streamIncome, 0),
    financingOut: model.yearly[model.yearly.length - 1].financingEndingOutstanding,
    endingCash: lastCF?.endingCash ?? 0,
    cumulativeCFO,
  };
  const margin = horizon.revenue > 0 ? horizon.ebitda / horizon.revenue : 0;

  const sensitivity = useMemo(() => buildSensitivity(scenario.assumptions, 0.1), [scenario]);
  const topRisks = sensitivity.rows.slice(0, 3);


  const yearlyChart = model.yearly.map((y) => ({
    year: String(y.year),
    revenue: y.totalIncome,
    ebitda: y.ebitda,
    cash: y.cashFlow,
    customers: y.endingCustomers,
    stream: y.streamIncome,
    financing: y.financingEndingOutstanding,
  }));

  const run = async (kind: "xlsx" | "pdf" | "pptx") => {
    setBusy(kind);
    try {
      if (kind === "xlsx") exportExcel(ctx);
      else if (kind === "pdf") exportPDF(ctx);
      else await exportPPTX(ctx);
    } finally {
      setTimeout(() => setBusy(null), 400);
    }
  };

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Board Pack"
        subtitle={`Horizon ${model.yearly[0].year}–${model.yearly[model.yearly.length - 1].year} · Scenario · ${scenario.name}`}
        right={
          <div className="flex items-center gap-2">
            <ExportButton
              label="Excel"
              icon={FileSpreadsheet}
              busy={busy === "xlsx"}
              onClick={() => run("xlsx")}
            />
            <ExportButton
              label="PDF"
              icon={FileText}
              busy={busy === "pdf"}
              onClick={() => run("pdf")}
            />
            <ExportButton
              label="PPTX"
              icon={Presentation}
              busy={busy === "pptx"}
              onClick={() => run("pptx")}
            />
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
        <KpiCard label="Horizon revenue" value={fmtSEK(horizon.revenue, { compact: true })} />
        <KpiCard
          label="Horizon EBITDA"
          value={fmtSEK(horizon.ebitda, { compact: true })}
          tone={horizon.ebitda >= 0 ? "positive" : "negative"}
        />
        <KpiCard
          label="EBITDA margin"
          value={fmtPct(margin)}
          tone={margin >= 0 ? "positive" : "negative"}
        />
        <KpiCard
          label="Horizon cash flow"
          value={fmtSEK(horizon.cash, { compact: true })}
          tone={horizon.cash >= 0 ? "positive" : "negative"}
        />
        <KpiCard label="Ending customers" value={fmtNum(horizon.endCustomers)} />
        <KpiCard label="Stream revenue" value={fmtSEK(horizon.streamRev, { compact: true })} />
        <KpiCard label="Financing outstanding" value={fmtSEK(horizon.financingOut, { compact: true })} />
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <ChartFrame title={`EBITDA bridge · ${bridgeYear.year}`}>
          <EbitdaWaterfall yearly={bridgeYear} />
        </ChartFrame>
        <ChartFrame title={`Financing margin bridge · ${bridgeYear.year}`}>
          <FinancingBridge yearly={bridgeYear} />
        </ChartFrame>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <ChartFrame title="Revenue & EBITDA">
          <ResponsiveContainer>
            <BarChart data={yearlyChart} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={false} />
              <YAxis tickFormatter={(v) => fmtSEK(v, { compact: true })} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 2, fontSize: 11 }}
                formatter={(v: number) => fmtSEK(v, { compact: true })}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" fillOpacity={0.85} />
              <Bar dataKey="ebitda" name="EBITDA" fill="hsl(var(--foreground))" fillOpacity={0.55} />
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>

        <ChartFrame title="Customer base">
          <ResponsiveContainer>
            <LineChart data={yearlyChart} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={false} />
              <YAxis tickFormatter={(v) => fmtNum(v)} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 2, fontSize: 11 }}
                formatter={(v: number) => fmtNum(v)}
              />
              <Line type="monotone" dataKey="customers" name="Customers" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartFrame>

        <ChartFrame title="Stream revenue">
          <ResponsiveContainer>
            <AreaChart data={yearlyChart} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={false} />
              <YAxis tickFormatter={(v) => fmtSEK(v, { compact: true })} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 2, fontSize: 11 }}
                formatter={(v: number) => fmtSEK(v, { compact: true })}
              />
              <Area type="monotone" dataKey="stream" name="Streams" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartFrame>

        <ChartFrame title="Financing outstanding">
          <ResponsiveContainer>
            <AreaChart data={yearlyChart} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={false} />
              <YAxis tickFormatter={(v) => fmtSEK(v, { compact: true })} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 2, fontSize: 11 }}
                formatter={(v: number) => fmtSEK(v, { compact: true })}
              />
              <Area type="monotone" dataKey="financing" name="Outstanding" stroke="hsl(var(--foreground))" fill="hsl(var(--foreground))" fillOpacity={0.18} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartFrame>
      </section>

      <section className="rounded-sm border border-border">
        <div className="border-b border-border px-4 py-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Yearly summary
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs tabular-nums">
            <thead className="bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Year</th>
                <th className="px-3 py-2 text-right">Customers</th>
                <th className="px-3 py-2 text-right">Revenue</th>
                <th className="px-3 py-2 text-right">EBITDA</th>
                <th className="px-3 py-2 text-right">Cash flow</th>
                <th className="px-3 py-2 text-right">Stream rev</th>
                <th className="px-3 py-2 text-right">Financing out.</th>
              </tr>
            </thead>
            <tbody>
              {model.yearly.map((y) => (
                <tr key={y.year} className="border-t border-border">
                  <td className="px-3 py-1.5 text-left font-medium">{y.year}</td>
                  <td className="px-3 py-1.5 text-right">{fmtNum(y.endingCustomers)}</td>
                  <td className="px-3 py-1.5 text-right">{fmtSEK(y.totalIncome, { compact: true })}</td>
                  <td className={`px-3 py-1.5 text-right ${y.ebitda < 0 ? "num-neg" : ""}`}>
                    {fmtSEK(y.ebitda, { compact: true })}
                  </td>
                  <td className={`px-3 py-1.5 text-right ${y.cashFlow < 0 ? "num-neg" : ""}`}>
                    {fmtSEK(y.cashFlow, { compact: true })}
                  </td>
                  <td className="px-3 py-1.5 text-right">{fmtSEK(y.streamIncome, { compact: true })}</td>
                  <td className="px-3 py-1.5 text-right">{fmtSEK(y.financingEndingOutstanding, { compact: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-[11px] text-muted-foreground">
        Excel = full monthly P&L, Cash flow, Balance sheet + 10-year summary · PDF = landscape board deck · PPTX = cover + KPI + charts + table. All exports render client-side from the live scenario.
      </p>
    </div>
  );
}

function ChartFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-sm border border-border bg-card/40 p-3">
      <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      <div className="h-[260px] w-full">{children}</div>
    </div>
  );
}

function ExportButton({
  label,
  icon: Icon,
  busy,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8 rounded-sm border-border text-xs"
      onClick={onClick}
      disabled={busy}
    >
      {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Icon className="mr-1.5 h-3.5 w-3.5" />}
      {label}
    </Button>
  );
}
