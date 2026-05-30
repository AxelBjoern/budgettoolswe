// Scenario store with localStorage persistence.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ActualMonth, Assumptions, Scenario } from "./types";
import { SEED_ASSUMPTIONS } from "./seed";

interface BudgetState {
  scenarios: Scenario[];
  activeScenarioId: string;
  selectedYear: number;
  density: "compact" | "comfortable";

  setActiveScenario: (id: string) => void;
  setSelectedYear: (year: number) => void;
  setDensity: (d: "compact" | "comfortable") => void;
  updateAssumptions: (id: string, patch: Partial<Assumptions>) => void;
  updateYear: (id: string, yearIndex: number, patch: Partial<Assumptions["perYear"][number]>) => void;
  addScenario: (name: string, from?: string) => void;
  deleteScenario: (id: string) => void;
  renameScenario: (id: string, name: string) => void;
  resetActive: () => void;
  setActual: (id: string, year: number, month: number, patch: Partial<ActualMonth>) => void;
  clearActuals: (id: string, year?: number) => void;
  setContractStartDate: (id: string, date: string | undefined) => void;
}

const baseScenario = (name: string, a?: Assumptions): Scenario => ({
  id: crypto.randomUUID(),
  name,
  createdAt: Date.now(),
  assumptions: a ? structuredClone(a) : structuredClone(SEED_ASSUMPTIONS),
  actuals: { rows: [] },
});

const initialBase = baseScenario("Base");

export const useBudgetStore = create<BudgetState>()(
  persist(
    (set, get) => ({
      scenarios: [initialBase],
      activeScenarioId: initialBase.id,
      selectedYear: SEED_ASSUMPTIONS.startYear,
      density: "compact",

      setActiveScenario: (id) => set({ activeScenarioId: id }),
      setSelectedYear: (year) => set({ selectedYear: year }),
      setDensity: (density) => set({ density }),

      updateAssumptions: (id, patch) =>
        set((s) => ({
          scenarios: s.scenarios.map((sc) =>
            sc.id === id
              ? { ...sc, assumptions: { ...sc.assumptions, ...patch } }
              : sc,
          ),
        })),

      updateYear: (id, yearIndex, patch) =>
        set((s) => ({
          scenarios: s.scenarios.map((sc) => {
            if (sc.id !== id) return sc;
            const perYear = sc.assumptions.perYear.map((y, i) =>
              i === yearIndex ? { ...y, ...patch } : y,
            );
            return { ...sc, assumptions: { ...sc.assumptions, perYear } };
          }),
        })),

      addScenario: (name, from) => {
        const source = from
          ? get().scenarios.find((s) => s.id === from)?.assumptions
          : undefined;
        const sc = baseScenario(name, source);
        set((s) => ({ scenarios: [...s.scenarios, sc], activeScenarioId: sc.id }));
      },

      deleteScenario: (id) =>
        set((s) => {
          const remaining = s.scenarios.filter((sc) => sc.id !== id);
          const next = remaining[0] ?? baseScenario("Base");
          return {
            scenarios: remaining.length ? remaining : [next],
            activeScenarioId:
              s.activeScenarioId === id ? next.id : s.activeScenarioId,
          };
        }),

      renameScenario: (id, name) =>
        set((s) => ({
          scenarios: s.scenarios.map((sc) => (sc.id === id ? { ...sc, name } : sc)),
        })),

      resetActive: () =>
        set((s) => ({
          scenarios: s.scenarios.map((sc) =>
            sc.id === s.activeScenarioId
              ? { ...sc, assumptions: structuredClone(SEED_ASSUMPTIONS) }
              : sc,
          ),
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
    }),
    { name: "budget-store-v6-financing" },
  ),
);

export function useActiveScenario() {
  return useBudgetStore((s) =>
    s.scenarios.find((sc) => sc.id === s.activeScenarioId) ?? s.scenarios[0],
  );
}
