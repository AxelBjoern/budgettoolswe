import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { compute, kpiForYear } from "@/lib/budget/engine";
import { useActiveScenario, useBudgetStore } from "@/lib/budget/store";
import { KpiCard } from "@/components/budget/KpiCard";
import { SectionHeader } from "@/components/budget/SectionHeader";
import { fmtSEK, fmtPct, fmtNum, MONTHS } from "@/lib/budget/format";
import { CHANNELS } from "@/lib/budget/types";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Nordenergi Budget" },
      {
        name: "description",
        content:
          "Five-year retail energy budget dashboard: customers, EBITDA, cash flow, and volume per price area.",
      },
    ],
  }),
  component: Dashboard,
});

const COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-muted-foreground)",
  "var(--color-success)",
];

function tooltipStyle() {
  return {
    backgroundColor: "var(--color-popover)",
    border: "1px solid var(--color-border)",
    borderRadius: 4,
    fontSize: 12,
    color: "var(--color-foreground)",
  };
}

function Dashboard() {
  const scenario = useActiveScenario();
  const year = useBudgetStore((s) => s.selectedYear);
  const model = useMemo(() => compute(scenario.assumptions), [scenario]);
  const kpi = kpiForYear(model, year);

  const monthlyForYear = model.monthly.filter((m) => m.year === year);

  const growthSeries = model.monthly.map((m, i) => ({
    idx: i,
    label: `${MONTHS[m.month - 1]} ${String(m.year).slice(2)}`,
    customers: m.endingCustomers,
  }));

  const channelData = CHANNELS.map((c) => {
    const row: Record<string, number | string> = { channel: c.label };
    for (const y of model.yearly) {
      row[String(y.year)] =
        scenario.assumptions.perYear[y.year - scenario.assumptions.startYear]
          .newCustomersByChannel[c.key];
    }
    return row;
  });

  const revVsCost = model.yearly.map((y) => ({
    year: String(y.year),
    Revenue: Math.round(y.totalIncome),
    Cost: Math.round(y.totalCost),
    EBITDA: Math.round(y.ebitda),
  }));

  const yRow = model.yearly.find((y) => y.year === year) ?? model.yearly[0];
  const waterfall = [
    { label: "Income", v: yRow.totalIncome, fill: "var(--color-chart-2)" },
    { label: "Energy cost", v: -yRow.electricityCost, fill: "var(--color-chart-5)" },
    { label: "Sales", v: -yRow.salesCost, fill: "var(--color-chart-5)" },
    { label: "OpEx", v: -yRow.otherExternal, fill: "var(--color-chart-5)" },
    { label: "Salaries", v: -yRow.salaryCost, fill: "var(--color-chart-5)" },
    { label: "EBITDA", v: yRow.ebitda, fill: "var(--color-chart-1)" },
  ];

  // Build accumulated cash flow series across full horizon
  let cum = 0;
  const cfSeries = model.monthly.map((m) => {
    cum += m.cashFlow;
    return {
      label: `${MONTHS[m.month - 1]} ${String(m.year).slice(2)}`,
      Accumulated: Math.round(cum),
    };
  });

  const areaData = (["SE1", "SE2", "SE3", "SE4"] as const).map((k) => ({
    name: k,
    value: Math.round(yRow.volumeByArea[k]),
  }));

  return (
    <div className="space-y-6">
      <SectionHeader
        title={`Forecast ${year}`}
        subtitle={`Scenario · ${scenario.name}`}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Customers (eoy)" value={fmtNum(kpi.customers)} />
        <KpiCard label="Turnover" value={fmtSEK(kpi.turnover, { compact: true })} />
        <KpiCard
          label="EBITDA"
          value={fmtSEK(kpi.ebitda, { compact: true })}
          tone={kpi.ebitda >= 0 ? "positive" : "negative"}
        />
        <KpiCard
          label="Cash flow"
          value={fmtSEK(kpi.cashFlow, { compact: true })}
          tone={kpi.cashFlow >= 0 ? "positive" : "negative"}
          sub="Year total"
        />
        <KpiCard label="CAC" value={`${fmtSEK(kpi.cac)} kr`} />
        <KpiCard label="Churn" value={fmtPct(kpi.churn)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Customer growth" subtitle="60-month book of business">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={growthSeries}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 4" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                interval={5}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                tickFormatter={(v) => fmtSEK(v, { compact: true })}
              />
              <Tooltip contentStyle={tooltipStyle()} />
              <Line
                type="monotone"
                dataKey="customers"
                stroke="var(--color-chart-1)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Revenue vs cost" subtitle="Per fiscal year">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={revVsCost}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 4" />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                tickFormatter={(v) => fmtSEK(v, { compact: true })}
              />
              <Tooltip
                contentStyle={tooltipStyle()}
                formatter={(v: number) => fmtSEK(v, { compact: true })}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Revenue" fill="var(--color-chart-1)" />
              <Bar dataKey="Cost" fill="var(--color-chart-3)" />
              <Bar dataKey="EBITDA" fill="var(--color-chart-2)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="New customers by channel" subtitle="Acquisition mix">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={channelData}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 4" />
              <XAxis
                dataKey="channel"
                tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              />
              <Tooltip contentStyle={tooltipStyle()} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {model.yearly.map((y, i) => (
                <Bar
                  key={y.year}
                  dataKey={String(y.year)}
                  stackId="a"
                  fill={COLORS[i % COLORS.length]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={`P&L bridge · ${year}`} subtitle="Income → EBITDA">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={waterfall}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 4" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                tickFormatter={(v) => fmtSEK(v, { compact: true })}
              />
              <Tooltip
                contentStyle={tooltipStyle()}
                formatter={(v: number) => fmtSEK(v, { compact: true })}
              />
              <Bar dataKey="v">
                {waterfall.map((d, i) => (
                  <Cell key={i} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Cash flow accumulated" subtitle="Full horizon">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={cfSeries}>
              <defs>
                <linearGradient id="cfgrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 4" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                interval={5}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                tickFormatter={(v) => fmtSEK(v, { compact: true })}
              />
              <Tooltip
                contentStyle={tooltipStyle()}
                formatter={(v: number) => fmtSEK(v, { compact: true })}
              />
              <Area
                type="monotone"
                dataKey="Accumulated"
                stroke="var(--color-chart-1)"
                fill="url(#cfgrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={`Volume per price area · ${year}`} subtitle="SE1–SE4 share">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={areaData}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={2}
              >
                {areaData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle()}
                formatter={(v: number) => `${fmtSEK(v, { compact: true })} kWh`}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div>
        <SectionHeader title="Monthly summary" subtitle={`${year}`} />
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full text-xs tabular-nums">
            <thead className="bg-muted/60 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Month</th>
                <th className="px-3 py-2 text-right">Customers</th>
                <th className="px-3 py-2 text-right">Income</th>
                <th className="px-3 py-2 text-right">Cost</th>
                <th className="px-3 py-2 text-right">EBITDA</th>
                <th className="px-3 py-2 text-right">Cash flow</th>
              </tr>
            </thead>
            <tbody>
              {monthlyForYear.map((m) => (
                <tr key={m.month} className="border-t border-border">
                  <td className="px-3 py-1.5 font-medium">{MONTHS[m.month - 1]}</td>
                  <td className="px-3 py-1.5 text-right">{fmtNum(m.endingCustomers)}</td>
                  <td className="px-3 py-1.5 text-right">{fmtSEK(m.totalIncome)}</td>
                  <td className="px-3 py-1.5 text-right">{fmtSEK(m.totalCost)}</td>
                  <td className={`px-3 py-1.5 text-right ${m.ebitda < 0 ? "num-neg" : ""}`}>{fmtSEK(m.ebitda)}</td>
                  <td className={`px-3 py-1.5 text-right ${m.cashFlow < 0 ? "num-neg" : ""}`}>{fmtSEK(m.cashFlow)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-sm border border-border bg-card p-4 animate-fade-in">
      <div className="mb-3 flex items-baseline justify-between border-b border-border pb-2">
        <h3 className="font-serif text-base font-bold">{title}</h3>
        {subtitle && (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {subtitle}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
