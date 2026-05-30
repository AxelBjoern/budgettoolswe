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
import type { YearlyRow } from "@/lib/budget/types";
import { fmtSEK } from "@/lib/budget/format";

/** EBITDA bridge: Revenue → COGS → Opex → Other → EBITDA. */
export function EbitdaWaterfall({ yearly }: { yearly: YearlyRow }) {
  const revenue = yearly.totalIncome;
  const cogs = -(yearly.electricityCost + yearly.certificateCost);
  const opex = -(yearly.salaryCost + yearly.otherExternal + yearly.invoicingCost + yearly.salesCost);
  const stream = -((yearly as any).streamCost ?? 0);
  const ebitda = yearly.ebitda;

  type Step = { name: string; value: number; cum: number; kind: "pos" | "neg" | "total" };
  const steps: Step[] = [];
  let cum = 0;
  const push = (name: string, value: number, kind: Step["kind"]) => {
    if (kind === "total") {
      steps.push({ name, value, cum: value, kind });
    } else {
      const start = cum;
      cum += value;
      steps.push({ name, value, cum, kind });
      // recharts stacked bar trick: floor + delta
      (steps[steps.length - 1] as any).floor = value >= 0 ? start : cum;
      (steps[steps.length - 1] as any).delta = Math.abs(value);
    }
  };
  push("Revenue", revenue, "total");
  cum = revenue;
  push("COGS", cogs, "neg");
  push("Stream COGS", stream, "neg");
  push("Opex", opex, "neg");
  push("EBITDA", ebitda, "total");

  const data = steps.map((s: any) => ({
    name: s.name,
    floor: s.kind === "total" ? 0 : s.floor,
    delta: s.kind === "total" ? s.value : s.delta,
    kind: s.kind,
    raw: s.kind === "total" ? s.value : s.value,
  }));

  return (
    <ResponsiveContainer>
      <BarChart data={data} margin={{ top: 16, right: 12, bottom: 8, left: 0 }}>
        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
        <YAxis tickFormatter={(v) => fmtSEK(v, { compact: true })} tick={{ fontSize: 10 }} />
        <Tooltip
          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 2, fontSize: 11 }}
          formatter={(_v, _n, p: any) => fmtSEK(p?.payload?.raw ?? 0, { compact: true })}
          labelFormatter={(l) => l}
        />
        <Bar dataKey="floor" stackId="a" fill="transparent" />
        <Bar dataKey="delta" stackId="a">
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={
                d.kind === "total"
                  ? "hsl(var(--primary))"
                  : d.kind === "pos"
                    ? "hsl(var(--success))"
                    : "hsl(var(--destructive))"
              }
              fillOpacity={d.kind === "total" ? 0.9 : 0.65}
            />
          ))}
          <LabelList
            dataKey="raw"
            position="top"
            formatter={(v: number) => fmtSEK(v, { compact: true })}
            style={{ fontSize: 9, fill: "hsl(var(--foreground))" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Financing cash bridge: inflows (interest, fees, principal repaid) vs outflows (disbursed, CoF, losses). */
export function FinancingBridge({ yearly }: { yearly: YearlyRow }) {
  const f: any = yearly;
  const interest = f.financingIncome ?? 0;
  const cof = -(f.financingCost ?? 0);
  const net = interest + cof;
  const data = [
    { name: "Interest & fees", value: interest, kind: "pos" as const, raw: interest },
    { name: "Cost of capital + losses", value: Math.abs(cof), kind: "neg" as const, raw: cof },
    { name: "Net financing margin", value: net, kind: "total" as const, raw: net },
  ];
  return (
    <ResponsiveContainer>
      <BarChart data={data} margin={{ top: 16, right: 12, bottom: 8, left: 0 }}>
        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
        <YAxis tickFormatter={(v) => fmtSEK(v, { compact: true })} tick={{ fontSize: 10 }} />
        <Tooltip
          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 2, fontSize: 11 }}
          formatter={(_v, _n, p: any) => fmtSEK(p?.payload?.raw ?? 0, { compact: true })}
        />
        <Bar dataKey="value">
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={
                d.kind === "total"
                  ? "hsl(var(--primary))"
                  : d.kind === "pos"
                    ? "hsl(var(--success))"
                    : "hsl(var(--destructive))"
              }
              fillOpacity={0.8}
            />
          ))}
          <LabelList
            dataKey="raw"
            position="top"
            formatter={(v: number) => fmtSEK(v, { compact: true })}
            style={{ fontSize: 9, fill: "hsl(var(--foreground))" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
