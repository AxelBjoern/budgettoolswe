import type { ReactNode } from "react";

interface Props {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "default" | "positive" | "negative";
}

export function KpiCard({ label, value, sub, tone = "default" }: Props) {
  const toneClass =
    tone === "positive"
      ? "text-success"
      : tone === "negative"
        ? "text-destructive"
        : "text-foreground";

  return (
    <div className="rounded-sm border border-border bg-card p-4 animate-fade-in">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-2 text-2xl font-bold tabular-nums ink-shadow ${toneClass}`}
      >
        {value}
      </div>
      <div className="mt-1 h-[2px] w-8 bg-accent" />
      {sub && (
        <div className="mt-2 text-xs text-muted-foreground tabular-nums">
          {sub}
        </div>
      )}
    </div>
  );
}
