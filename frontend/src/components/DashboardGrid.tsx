import { useMemo } from "react";
import { ResponsiveGridLayout, useContainerWidth } from "react-grid-layout";
import type { LayoutItem } from "react-grid-layout";
import { Activity, AlertTriangle, GripVertical, TrendingDown, Users } from "lucide-react";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getDashboardStats } from "@/lib/stats.functions";
import { ChartRenderer } from "@/components/ChartRenderer";
import { ChatPanel } from "@/components/ChatPanel";
import { CustomChartTile } from "@/components/CustomChartTile";
import { useDashboard, dashboardStore, type Tile } from "@/lib/dashboard-store";

const statsQuery = queryOptions({
  queryKey: ["dashboard-stats"],
  queryFn: () => getDashboardStats(),
  refetchInterval: 30_000,
});

export function DashboardGrid() {
  const { tiles, layout } = useDashboard();
  const { data } = useSuspenseQuery(statsQuery);
  const { width, containerRef, mounted } = useContainerWidth();

  const visibleTiles = useMemo(() => tiles.filter((t) => !t.hidden), [tiles]);
  const visibleIds = useMemo(
    () => new Set(visibleTiles.map((t) => t.id)),
    [visibleTiles],
  );

  // Only pass layout items for visible tiles; RGL requires every child to have layout.
  const effectiveLayout: LayoutItem[] = useMemo(() => {
    const byId = new Map(layout.map((l) => [l.i, l]));
    return visibleTiles.map((t, i) => {
      const existing = byId.get(t.id);
      if (existing) return { ...existing };
      // Fallback for tiles not in stored layout
      return { i: t.id, x: (i * 4) % 12, y: 100 + i, w: 4, h: 7 };
    });
  }, [layout, visibleTiles]);

  return (
    <div ref={containerRef} className="w-full">
      {mounted && width > 0 && (
        <ResponsiveGridLayout
          width={width}
          layouts={{ lg: effectiveLayout, md: effectiveLayout, sm: effectiveLayout }}
          breakpoints={{ lg: 1200, md: 768, sm: 0 }}
          cols={{ lg: 12, md: 8, sm: 4 }}
          rowHeight={40}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          dragConfig={{ handle: ".drag-handle" }}
          onLayoutChange={(newLayout) => {
            // Merge with hidden tiles' stored layout so hiding doesn't erase positions.
            const merged: LayoutItem[] = [
              ...newLayout.map((l) => ({ ...l })),
              ...layout.filter((l) => !visibleIds.has(l.i)),
            ];
            dashboardStore.setLayout(merged);
          }}
        >
          {visibleTiles.map((tile) => (
            <div key={tile.id} className="rgl-tile">
              <TileFrame tile={tile}>
                <TileBody tile={tile} data={data} />
              </TileFrame>
            </div>
          ))}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}

function TileFrame({ tile, children }: { tile: Tile; children: React.ReactNode }) {
  return (
    <div className="h-full flex flex-col bg-surface border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-border/50">
        <button
          className="drag-handle cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-foreground"
          title="Drag to move"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground truncate flex-1">
          {tile.title}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

type Stats = Awaited<ReturnType<typeof getDashboardStats>>;

function TileBody({ tile, data }: { tile: Tile; data: Stats }) {
  const { kpis, funnel, dailySessions, formErrors } = data;
  const color = tile.kind !== "chat" ? tile.color : undefined;

  switch (tile.kind) {
    case "kpi-sessions":
      return (
        <KpiBody
          icon={<Users className="w-4 h-4" />}
          value={kpis.sessions7d.toLocaleString()}
          hue={color}
        />
      );
    case "kpi-active":
      return (
        <KpiBody
          icon={<Activity className="w-4 h-4" />}
          value={kpis.activeNow.toLocaleString()}
          sub="last 5 min"
          hue={color}
        />
      );
    case "kpi-completion":
      return (
        <KpiBody
          icon={<TrendingDown className="w-4 h-4" />}
          value={`${kpis.completionRate.toFixed(1)}%`}
          sub="last 30d"
          hue={color}
        />
      );
    case "kpi-dropoff":
      return (
        <KpiBody
          icon={<AlertTriangle className="w-4 h-4" />}
          value={kpis.biggestDropStep}
          sub={
            kpis.biggestDropCount
              ? `−${kpis.biggestDropCount.toLocaleString()} sessions`
              : "no data"
          }
          hue={color}
          mono={false}
        />
      );
    case "chart-funnel":
      return (
        <ChartBody>
          <ChartRenderer
            type="funnel"
            xKey="step_name"
            yKey="sessions"
            data={funnel}
            height="100%"
            color={color}
          />
        </ChartBody>
      );
    case "chart-daily":
      return (
        <ChartBody>
          <ChartRenderer
            type="line"
            xKey="day"
            yKey="sessions"
            data={dailySessions}
            height="100%"
            color={color}
          />
        </ChartBody>
      );
    case "chart-errors":
      return (
        <ChartBody>
          <ChartRenderer
            type="bar"
            xKey="field"
            yKey="errors"
            data={formErrors}
            height="100%"
            color={color}
          />
        </ChartBody>
      );
    case "chat":
      return (
        <div className="h-full">
          <ChatPanel embedded />
        </div>
      );
    case "custom":
      return <CustomChartTile tile={tile} />;
    default:
      return null;
  }
}

function KpiBody({
  icon,
  value,
  sub,
  hue,
  mono = true,
}: {
  icon: React.ReactNode;
  value: string;
  sub?: string;
  hue?: number;
  mono?: boolean;
}) {
  const color = typeof hue === "number" ? `oklch(0.58 0.22 ${hue})` : "var(--color-primary)";
  return (
    <div className="p-4 h-full flex flex-col justify-center">
      <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
        <span style={{ color }}>{icon}</span>
      </div>
      <div
        className={`mt-1 ${mono ? "kpi-number text-3xl" : "font-semibold text-lg leading-tight"}`}
        title={value}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground font-mono mt-1">{sub}</div>}
    </div>
  );
}

function ChartBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full h-full px-3 pb-3 pt-1 min-h-0">{children}</div>
  );
}
