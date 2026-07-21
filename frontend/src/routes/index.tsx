import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Suspense, useEffect } from "react";
import { getDashboardStats } from "@/lib/stats.functions";
import { DashboardGrid } from "@/components/DashboardGrid";
import { SettingsPanel } from "@/components/SettingsPanel";
import { AddChartDialog } from "@/components/AddChartDialog";
import { useDashboard } from "@/lib/dashboard-store";

const statsQuery = queryOptions({
  queryKey: ["dashboard-stats"],
  queryFn: () => getDashboardStats(),
  refetchInterval: 30_000,
});

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(statsQuery),
  component: DashboardPage,
});

function DashboardPage() {
  const { theme, accentHue } = useDashboard();

  // Sync theme class and accent hue to :root
  useEffect(() => {
    const html = document.documentElement;
    if (theme === "dark") html.classList.add("dark");
    else html.classList.remove("dark");
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary", `oklch(0.58 0.22 ${accentHue})`);
    root.style.setProperty("--accent", `oklch(0.58 0.22 ${accentHue})`);
    root.style.setProperty("--ring", `oklch(0.58 0.22 ${accentHue})`);
  }, [accentHue]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 shrink-0 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">
              P
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight truncate">Pulse</h1>
              <p className="text-xs text-muted-foreground font-mono truncate">
                banking-app-prototype · analytics
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:block text-xs font-mono text-muted-foreground mr-2">
              live · 30s
            </div>
            <AddChartDialog />
            <SettingsPanel />
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6">
        <Suspense fallback={<GridSkeleton />}>
          <DashboardGrid />
        </Suspense>
      </main>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-surface border border-border rounded-2xl p-4 h-28 animate-pulse"
        />
      ))}
    </div>
  );
}

// Suppress unused-import warning in generated route tree
export const _preload = getDashboardStats;
