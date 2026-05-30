import { Link, useLocation } from "@tanstack/react-router";
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
import {
  LayoutDashboard,
  Sliders,
  CalendarRange,
  GitCompare,
  ClipboardList,
  FileBarChart,
} from "lucide-react";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/budget", label: "Budget", icon: Sliders },
  { to: "/monthly", label: "Monthly", icon: CalendarRange },
  { to: "/statements", label: "Statements", icon: FileBarChart },
  { to: "/results", label: "Results", icon: ClipboardList },
  { to: "/scenarios", label: "Scenarios", icon: GitCompare },
] as const;

export function Topbar() {
  const loc = useLocation();
  const scenarios = useBudgetStore((s) => s.scenarios);
  const activeId = useBudgetStore((s) => s.activeScenarioId);
  const setActive = useBudgetStore((s) => s.setActiveScenario);
  const year = useBudgetStore((s) => s.selectedYear);
  const setYear = useBudgetStore((s) => s.setSelectedYear);
  const density = useBudgetStore((s) => s.density);
  const setDensity = useBudgetStore((s) => s.setDensity);
  const updateAssumptions = useBudgetStore((s) => s.updateAssumptions);
  const setContractStartDate = useBudgetStore((s) => s.setContractStartDate);
  const scenario = useActiveScenario();
  const appr = scenario.assumptions.salesAppreciationPct ?? 0;

  return (
    <header className="border-b border-border bg-card/60 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-4 px-6 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-sm bg-primary text-primary-foreground font-serif text-lg">
            N
          </span>
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-wide ink-shadow">
              NORDENERGI
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Budget Terminal
            </div>
          </div>
        </Link>

        <nav className="ml-6 flex items-center gap-1">
          {nav.map((n) => {
            const active = loc.pathname === n.to;
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
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
              Contract start
            </span>
            <Input
              type="date"
              value={scenario.contractStartDate ?? ""}
              onChange={(e) =>
                setContractStartDate(scenario.id, e.target.value || undefined)
              }
              className="h-8 w-[140px] rounded-sm border-border bg-background text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Apprec. %/yr
            </span>
            <Input
              type="number"
              step={0.5}
              value={(appr * 100).toFixed(2)}
              onChange={(e) =>
                updateAssumptions(scenario.id, {
                  salesAppreciationPct: Number(e.target.value) / 100,
                })
              }
              className="h-8 w-[70px] rounded-sm border-border bg-background text-right text-xs tabular-nums"
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
              <SelectTrigger className="h-8 w-[88px] rounded-sm border-border bg-background text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2026, 2027, 2028, 2029, 2030].map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Scenario
            </span>
            <Select value={activeId} onValueChange={setActive}>
              <SelectTrigger className="h-8 w-[160px] rounded-sm border-border bg-background text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {scenarios.map((sc) => (
                  <SelectItem key={sc.id} value={sc.id}>
                    {sc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
