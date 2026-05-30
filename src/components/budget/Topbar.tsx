import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useActiveScenario, useBudgetStore } from "@/lib/budget/store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScenarioMenu } from "./ScenarioMenu";
import { AssumptionsDrawer } from "./AssumptionsDrawer";
import {
  LayoutDashboard,
  Sliders,
  CalendarRange,
  GitCompare,
  ClipboardList,
  FileBarChart,
  Landmark,
  Activity,
  BookOpenCheck,
  History,
} from "lucide-react";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/budget", label: "Budget", icon: Sliders },
  { to: "/monthly", label: "Monthly", icon: CalendarRange },
  { to: "/statements", label: "Statements", icon: FileBarChart },
  { to: "/financing", label: "Financing", icon: Landmark },
  { to: "/sensitivity", label: "Sensitivity", icon: Activity },
  { to: "/compare", label: "Compare", icon: GitCompare },
  { to: "/board", label: "Board pack", icon: BookOpenCheck },
  { to: "/results", label: "Results", icon: ClipboardList },
  { to: "/changelog", label: "Log", icon: History },
] as const;

function relativeTime(ts: number) {
  const d = Date.now() - ts;
  if (d < 60_000) return "just now";
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m ago`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`;
  return `${Math.floor(d / 86_400_000)}d ago`;
}

export function Topbar() {
  const loc = useLocation();
  const year = useBudgetStore((s) => s.selectedYear);
  const setYear = useBudgetStore((s) => s.setSelectedYear);
  const density = useBudgetStore((s) => s.density);
  const setDensity = useBudgetStore((s) => s.setDensity);
  const version = useBudgetStore((s) => s.version);
  const lastUpdated = useBudgetStore((s) => s.lastUpdated);
  const setContractStartDate = useBudgetStore((s) => s.setContractStartDate);
  const scenario = useActiveScenario();

  return (
    <header className="border-b border-border bg-card/60 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-6 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-sm bg-primary text-primary-foreground font-serif text-lg">
            N
          </span>
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-wide ink-shadow">
              NORDENERGI
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Budget Terminal · v{version} · {relativeTime(lastUpdated)}
            </div>
          </div>
        </Link>

        <nav className="ml-4 flex flex-wrap items-center gap-1">
          {nav.map((n) => {
            const active = loc.pathname === n.to;
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wider transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Contract
            </span>
            <Input
              type="date"
              value={scenario.contractStartDate ?? ""}
              onChange={(e) =>
                setContractStartDate(scenario.id, e.target.value || undefined)
              }
              className="h-8 w-[130px] rounded-sm border-border bg-background text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Year
            </span>
            <Select
              value={String(year)}
              onValueChange={(v) => setYear(Number(v))}
            >
              <SelectTrigger className="h-8 w-[84px] rounded-sm border-border bg-background text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 10 }, (_, i) => 2026 + i).map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ScenarioMenu />
          <AssumptionsDrawer />

          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-sm border-border text-xs"
            onClick={() =>
              setDensity(density === "compact" ? "comfortable" : "compact")
            }
            title="Toggle density"
          >
            {density === "compact" ? "Compact" : "Roomy"}
          </Button>
        </div>
      </div>
    </header>
  );
}
