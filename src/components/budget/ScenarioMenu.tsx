import { useState } from "react";
import { useActiveScenario, useBudgetStore, useIsLocked } from "@/lib/budget/store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Lock, Unlock, Pencil, Trash2, Plus, Star, ChevronDown } from "lucide-react";

export function ScenarioMenu() {
  const scenarios = useBudgetStore((s) => s.scenarios);
  const activeId = useBudgetStore((s) => s.activeScenarioId);
  const baseId = useBudgetStore((s) => s.baseScenarioId);
  const setActive = useBudgetStore((s) => s.setActiveScenario);
  const duplicate = useBudgetStore((s) => s.duplicateScenario);
  const del = useBudgetStore((s) => s.deleteScenario);
  const rename = useBudgetStore((s) => s.renameScenario);
  const toggleLock = useBudgetStore((s) => s.toggleLock);
  const setBase = useBudgetStore((s) => s.setBaseScenario);
  const add = useBudgetStore((s) => s.addScenario);
  const active = useActiveScenario();
  const isLocked = useIsLocked(active.id);

  const [renameOpen, setRenameOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [draft, setDraft] = useState("");

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 min-w-[180px] justify-between rounded-sm border-border text-xs"
          >
            <span className="flex items-center gap-1.5 truncate">
              {isLocked && <Lock className="h-3 w-3" />}
              {active.id === baseId && <Star className="h-3 w-3 fill-current" />}
              <span className="truncate">{active.name}</span>
            </span>
            <ChevronDown className="ml-2 h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64">
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Switch scenario
          </DropdownMenuLabel>
          {scenarios.map((sc) => (
            <DropdownMenuItem
              key={sc.id}
              onClick={() => setActive(sc.id)}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <span className="flex items-center gap-1.5">
                {sc.id === baseId && <Star className="h-3 w-3 fill-current text-primary" />}
                {sc.name}
              </span>
              {sc.id === activeId && <span className="text-[10px] text-primary">active</span>}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setDraft("");
              setNewOpen(true);
            }}
            className="text-xs"
          >
            <Plus className="mr-2 h-3.5 w-3.5" /> New scenario
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => duplicate(activeId)} className="text-xs">
            <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate "{active.name}"
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setDraft(active.name);
              setRenameOpen(true);
            }}
            className="text-xs"
            disabled={isLocked}
          >
            <Pencil className="mr-2 h-3.5 w-3.5" /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => toggleLock(activeId)} className="text-xs">
            {isLocked ? (
              <>
                <Unlock className="mr-2 h-3.5 w-3.5" /> Unlock
              </>
            ) : (
              <>
                <Lock className="mr-2 h-3.5 w-3.5" /> Lock (read-only)
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setBase(activeId)}
            className="text-xs"
            disabled={activeId === baseId}
          >
            <Star className="mr-2 h-3.5 w-3.5" /> Set as base
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              if (isLocked) return;
              if (scenarios.length === 1) return;
              if (confirm(`Delete scenario "${active.name}"?`)) del(activeId);
            }}
            className="text-xs text-destructive"
            disabled={isLocked || scenarios.length === 1}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename scenario</DialogTitle>
          </DialogHeader>
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (draft.trim()) rename(activeId, draft.trim());
                setRenameOpen(false);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New scenario</DialogTitle>
          </DialogHeader>
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Scenario name (e.g. Optimistic)"
            autoFocus
          />
          <p className="text-[11px] text-muted-foreground">
            Created as a copy of the currently active scenario.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (draft.trim()) add(draft.trim(), activeId);
                setNewOpen(false);
              }}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
