import { createFileRoute } from "@tanstack/react-router";
import { useBudgetStore } from "@/lib/budget/store";
import { SectionHeader } from "@/components/budget/SectionHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/changelog")({
  head: () => ({
    meta: [
      { title: "Change Log — Nordenergi Budget" },
      { name: "description", content: "Audit trail of assumption and scenario changes." },
    ],
  }),
  component: ChangelogPage,
});

function ChangelogPage() {
  const log = useBudgetStore((s) => s.auditLog);
  const clear = useBudgetStore((s) => s.clearAuditLog);
  const version = useBudgetStore((s) => s.version);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Change log"
        subtitle={`Version ${version} · last ${log.length} entries (max 200)`}
        right={
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-sm text-xs"
            onClick={() => {
              if (confirm("Clear the entire audit log?")) clear();
            }}
            disabled={!log.length}
          >
            Clear log
          </Button>
        }
      />

      {!log.length ? (
        <p className="text-sm text-muted-foreground">
          No changes recorded yet. Edit any assumption to start tracking.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Timestamp</th>
                <th className="px-3 py-2 text-left">Scenario</th>
                <th className="px-3 py-2 text-left">Field</th>
                <th className="px-3 py-2 text-left">Change</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {log.map((e) => (
                <tr key={e.ts} className="border-t border-border">
                  <td className="px-3 py-1.5 text-muted-foreground">
                    {new Date(e.ts).toLocaleString()}
                  </td>
                  <td className="px-3 py-1.5">{e.scenarioName}</td>
                  <td className="px-3 py-1.5 font-mono text-[11px]">{e.field}</td>
                  <td className="px-3 py-1.5">{e.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
