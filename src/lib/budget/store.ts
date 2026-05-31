// Scenario store with localStorage persistence.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ActualMonth, Assumptions, Scenario } from "./types";
import { SEED_ASSUMPTIONS } from "./seed";

export interface AuditEntry {
  ts: number;
  scenarioId: string;
  scenarioName: string;
  field: string;
  summary: string;
}

interface BudgetState {
  scenarios: Scenario[];
  activeScenarioId: string;
  baseScenarioId: string;
  lockedScenarioIds: string[];
  compareScenarios: string[];
  auditLog: AuditEntry[];
  version: number;
  lastUpdated: number;
  selectedYear: number;
  density: "compact" | "comfortable";

  setActiveScenario: (id: string) => void;
  setSelectedYear: (year: number) => void;
  setDensity: (d: "compact" | "comfortable") => void;
  updateAssumptions: (id: string, patch: Partial<Assumptions>) => void;
  updateYear: (id: string, yearIndex: number, patch: Partial<Assumptions["perYear"][number]>) => void;
  addScenario: (name: string, from?: string) => void;
  duplicateScenario: (id: string) => void;
  deleteScenario: (id: string) => void;
  renameScenario: (id: string, name: string) => void;
  toggleLock: (id: string) => void;
  setBaseScenario: (id: string) => void;
  setCompareScenarios: (ids: string[]) => void;
  resetActive: () => void;
  setActual: (id: string, year: number, month: number, patch: Partial<ActualMonth>) => void;
  clearActuals: (id: string, year?: number) => void;
  setContractStartDate: (id: string, date: string | undefined) => void;
  revertAudit: (entryTs: number) => void;
  clearAuditLog: () => void;
}

const baseScenario = (name: string, a?: Assumptions): Scenario => ({
  id: crypto.randomUUID(),
  name,
  createdAt: Date.now(),
  assumptions: a ? structuredClone(a) : structuredClone(SEED_ASSUMPTIONS),
  actuals: { rows: [] },
});

const initialBase = baseScenario("Base");

function logChange(
  state: BudgetState,
  scenarioId: string,
  field: string,
  summary: string,
): Partial<BudgetState> {
  const sc = state.scenarios.find((s) => s.id === scenarioId);
  const entry: AuditEntry = {
    ts: Date.now(),
    scenarioId,
    scenarioName: sc?.name ?? "—",
    field,
    summary,
  };
  const auditLog = [entry, ...state.auditLog].slice(0, 200);
  return {
    auditLog,
    version: state.version + 1,
    lastUpdated: entry.ts,
  };
}

export const useBudgetStore = create<BudgetState>()(
  persist(
    (set, get) => ({
      scenarios: [initialBase],
      activeScenarioId: initialBase.id,
      baseScenarioId: initialBase.id,
      lockedScenarioIds: [],
      compareScenarios: [initialBase.id],
      auditLog: [],
      version: 1,
      lastUpdated: Date.now(),
      selectedYear: SEED_ASSUMPTIONS.startYear,
      density: "compact",

      setActiveScenario: (id) => set({ activeScenarioId: id }),
      setSelectedYear: (year) => set({ selectedYear: year }),
      setDensity: (density) => set({ density }),

      updateAssumptions: (id, patch) =>
        set((s) => {
          if (s.lockedScenarioIds.includes(id)) return s;
          const fields = Object.keys(patch).join(", ");
          return {
            scenarios: s.scenarios.map((sc) =>
              sc.id === id
                ? { ...sc, assumptions: { ...sc.assumptions, ...patch } }
                : sc,
            ),
            ...logChange(s, id, fields, `Updated ${fields}`),
          };
        }),

      updateYear: (id, yearIndex, patch) =>
        set((s) => {
          if (s.lockedScenarioIds.includes(id)) return s;
          const fields = Object.keys(patch).join(", ");
          const perYear = s.scenarios
            .find((sc) => sc.id === id)
            ?.assumptions.perYear.map((y, i) =>
              i === yearIndex ? { ...y, ...patch } : y,
            ) ?? [];
          return {
            scenarios: s.scenarios.map((sc) =>
              sc.id === id
                ? { ...sc, assumptions: { ...sc.assumptions, perYear } }
                : sc,
            ),
            ...logChange(s, id, `Y${yearIndex + 1}.${fields}`, `Y${yearIndex + 1}: ${fields}`),
          };
        }),

      addScenario: (name, from) => {
        const source = from
          ? get().scenarios.find((s) => s.id === from)?.assumptions
          : undefined;
        const sc = baseScenario(name, source);
        set((s) => ({
          scenarios: [...s.scenarios, sc],
          activeScenarioId: sc.id,
          compareScenarios: [...new Set([...s.compareScenarios, sc.id])].slice(0, 4),
          ...logChange(s, sc.id, "scenario", `Created scenario "${name}"`),
        }));
      },

      duplicateScenario: (id) => {
        const src = get().scenarios.find((s) => s.id === id);
        if (!src) return;
        const sc = baseScenario(`${src.name} copy`, src.assumptions);
        set((s) => ({
          scenarios: [...s.scenarios, sc],
          activeScenarioId: sc.id,
          ...logChange(s, sc.id, "scenario", `Duplicated "${src.name}"`),
        }));
      },

      deleteScenario: (id) =>
        set((s) => {
          if (s.lockedScenarioIds.includes(id)) return s;
          const remaining = s.scenarios.filter((sc) => sc.id !== id);
          const next = remaining[0] ?? baseScenario("Base");
          return {
            scenarios: remaining.length ? remaining : [next],
            activeScenarioId:
              s.activeScenarioId === id ? next.id : s.activeScenarioId,
            baseScenarioId: s.baseScenarioId === id ? next.id : s.baseScenarioId,
            compareScenarios: s.compareScenarios.filter((x) => x !== id),
            ...logChange(s, id, "scenario", `Deleted scenario`),
          };
        }),

      renameScenario: (id, name) =>
        set((s) => ({
          scenarios: s.scenarios.map((sc) => (sc.id === id ? { ...sc, name } : sc)),
          ...logChange(s, id, "name", `Renamed to "${name}"`),
        })),

      toggleLock: (id) =>
        set((s) => {
          const locked = s.lockedScenarioIds.includes(id);
          return {
            lockedScenarioIds: locked
              ? s.lockedScenarioIds.filter((x) => x !== id)
              : [...s.lockedScenarioIds, id],
            ...logChange(s, id, "lock", locked ? "Unlocked" : "Locked"),
          };
        }),

      setBaseScenario: (id) =>
        set((s) => ({
          baseScenarioId: id,
          ...logChange(s, id, "base", "Set as base scenario"),
        })),

      setCompareScenarios: (ids) =>
        set({ compareScenarios: ids.slice(0, 4) }),

      resetActive: () =>
        set((s) => ({
          scenarios: s.scenarios.map((sc) =>
            sc.id === s.activeScenarioId
              ? { ...sc, assumptions: structuredClone(SEED_ASSUMPTIONS) }
              : sc,
          ),
          ...logChange(s, s.activeScenarioId, "reset", "Reset to defaults"),
        })),

      setActual: (id, year, month, patch) =>
        set((s) => ({
          scenarios: s.scenarios.map((sc) => {
            if (sc.id !== id) return sc;
            const rows = sc.actuals?.rows ?? [];
            const idx = rows.findIndex((r) => r.year === year && r.month === month);
            const next = idx >= 0
              ? rows.map((r, i) => (i === idx ? { ...r, ...patch, year, month } : r))
              : [...rows, { year, month, ...patch }];
            return { ...sc, actuals: { rows: next } };
          }),
        })),

      clearActuals: (id, year) =>
        set((s) => ({
          scenarios: s.scenarios.map((sc) => {
            if (sc.id !== id) return sc;
            if (year == null) return { ...sc, actuals: { rows: [] } };
            return {
              ...sc,
              actuals: { rows: (sc.actuals?.rows ?? []).filter((r) => r.year !== year) },
            };
          }),
        })),

      setContractStartDate: (id, date) =>
        set((s) => ({
          scenarios: s.scenarios.map((sc) =>
            sc.id === id ? { ...sc, contractStartDate: date } : sc,
          ),
        })),

      revertAudit: (entryTs) =>
        set((s) => ({
          auditLog: s.auditLog.filter((e) => e.ts !== entryTs),
        })),

      clearAuditLog: () => set({ auditLog: [] }),
    }),
    {
      name: "budget-store-v8-zero",
      migrate: (persisted: any) => {
        if (!persisted) return persisted;
        persisted.baseScenarioId ??= persisted.activeScenarioId ?? persisted.scenarios?.[0]?.id;
        persisted.lockedScenarioIds ??= [];
        persisted.compareScenarios ??= persisted.scenarios?.slice(0, 2).map((s: any) => s.id) ?? [];
        persisted.auditLog ??= [];
        persisted.version ??= 1;
        persisted.lastUpdated ??= Date.now();
        return persisted;
      },
      version: 8,
    },
  ),
);

export function useActiveScenario() {
  return useBudgetStore((s) =>
    s.scenarios.find((sc) => sc.id === s.activeScenarioId) ?? s.scenarios[0],
  );
}

export function useIsLocked(id: string) {
  return useBudgetStore((s) => s.lockedScenarioIds.includes(id));
}
