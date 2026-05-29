import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Topbar } from "@/components/budget/Topbar";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Topbar />
      <main className="mx-auto max-w-[1400px] px-6 py-6">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-[1400px] px-6 py-4 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Nordenergi · Budget Terminal · 2026–2030 · figures in SEK
      </footer>
    </div>
  );
}
