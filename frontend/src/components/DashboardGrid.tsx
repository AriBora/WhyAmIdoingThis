import { useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ResponsiveGridLayout, useContainerWidth } from "react-grid-layout";
import type { LayoutItem } from "react-grid-layout";
import { GripVertical } from "lucide-react";
import { api, type Tile } from "@/lib/api";
import { TileCustomizePopover } from "./TileCustomizePopover";
import { FeedbackTable } from "./FeedbackTable";
import { ChartRenderer } from "./ChartRenderer";

const FEEDBACK_SENTINEL = "__feedback__";

function feedbackLayoutKey(appId: string) {
  return `feedback_tile_layout_${appId}`;
}

function saveFeedbackLayout(
  appId: string,
  item: { x: number; y: number; w: number; h: number },
  currentCols: number = 12,
) {
  try {
    // If it spans full width of the current column count and starts at 0, treat as default full-width (12 cols)
    const isFullWidth = item.x === 0 && item.w >= currentCols;
    const toSave = {
      x: isFullWidth ? 0 : item.x,
      y: item.y,
      w: isFullWidth ? 12 : item.w,
      h: item.h,
      isCustomized: !isFullWidth,
    };
    localStorage.setItem(feedbackLayoutKey(appId), JSON.stringify(toSave));
  } catch {
    /* ignore */
  }
}

function loadFeedbackLayout(appId: string): { x: number; y: number; w: number; h: number } | null {
  try {
    const raw = localStorage.getItem(feedbackLayoutKey(appId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { x: number; y: number; w: number; h: number; isCustomized?: boolean };
    // Default to max width (12 columns) unless explicitly customized by the user
    if (!parsed.isCustomized) {
      return { ...parsed, x: 0, w: 12 };
    }
    return parsed;
  } catch {
    return null;
  }
}

function synthesizeFeedbackTile(appId: string, bottomY: number): Tile {
  const saved = loadFeedbackLayout(appId);
  return {
    id: `feedback_${appId}`,
    application_id: appId,
    title: "Feedback",
    chart_type: "table",
    sql_query: FEEDBACK_SENTINEL,
    x: saved?.x ?? 0,
    y: bottomY, // always below all other tiles
    w: saved?.w ?? 12, // maximum width by default
    h: saved?.h ?? 10,
    color: 265,
    refresh_seconds: 120,
  };
}

export function DashboardGrid({ appId }: { appId: string }) {
  const qc = useQueryClient();
  const { data: tiles = [] } = useQuery({
    queryKey: ["tiles", appId],
    queryFn: () => api.listTiles(appId),
    enabled: Boolean(appId),
  });

  const { width, containerRef, mounted } = useContainerWidth();

  const effectiveTiles: Tile[] = useMemo(() => {
    // Always show the feedback tile at the end; the backend may already
    // return one, in which case we don't duplicate.
    const hasFeedback = tiles.some((t) => t.sql_query === FEEDBACK_SENTINEL);
    if (hasFeedback) return tiles;
    // Compute the bottom edge of all real tiles so feedback always sits below them.
    const bottomY = tiles.reduce((max, t) => Math.max(max, t.y + t.h), 0);
    return [...tiles, synthesizeFeedbackTile(appId, bottomY)];
  }, [tiles, appId]);

  const layout: LayoutItem[] = useMemo(
    () =>
      effectiveTiles.map((t) => ({
        i: t.id,
        x: t.x,
        y: t.y,
        w: t.w,
        h: t.h,
      })),
    [effectiveTiles],
  );

  const pendingSave = useRef<number | null>(null);

  const persistLayout = useMutation({
    mutationFn: async (items: LayoutItem[]) => {
      // Only PATCH real backend tiles, never the synthetic feedback tile.
      await Promise.all(
        items
          .filter((l) => !l.i.startsWith("feedback_"))
          .map((l) =>
            api.updateTile(l.i, { x: l.x, y: l.y, w: l.w, h: l.h }).catch(() => null),
          ),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tiles", appId] }),
  });

  function onLayoutChange(items: readonly LayoutItem[]) {
    const snapshot = items.map((l) => ({ ...l }));

    // Determine current grid column count based on width breakpoint
    const currentCols = width >= 1200 ? 12 : width >= 768 ? 8 : 4;

    // Persist feedback tile position locally (it has no backend row).
    const fbItem = snapshot.find((l) => l.i.startsWith("feedback_"));
    if (fbItem) {
      saveFeedbackLayout(
        appId,
        { x: fbItem.x, y: fbItem.y, w: fbItem.w, h: fbItem.h },
        currentCols,
      );
    }

    if (pendingSave.current) window.clearTimeout(pendingSave.current);
    pendingSave.current = window.setTimeout(() => persistLayout.mutate(snapshot), 400);
  }

  return (
    <div ref={containerRef} className="w-full">
      {mounted && width > 0 && (
        <ResponsiveGridLayout
          width={width}
          layouts={{ lg: layout, md: layout, sm: layout }}
          breakpoints={{ lg: 1200, md: 768, sm: 0 }}
          cols={{ lg: 12, md: 8, sm: 4 }}
          rowHeight={40}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          dragConfig={{ handle: ".drag-handle" }}
          onLayoutChange={onLayoutChange}
        >
          {effectiveTiles.map((tile) => (
            <div key={tile.id} className="rgl-tile">
              <TileFrame tile={tile} />
            </div>
          ))}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}

function TileFrame({ tile }: { tile: Tile }) {
  return (
    <div className="h-full flex flex-col bg-surface border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-border/50 shrink-0">
        <button
          className="drag-handle cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-foreground"
          title="Drag to move"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground truncate flex-1">
          {tile.title}
        </div>
        <TileCustomizePopover tile={tile} />
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <TileBody tile={tile} />
      </div>
    </div>
  );
}

function TileBody({ tile }: { tile: Tile }) {
  if (tile.sql_query === FEEDBACK_SENTINEL || tile.id.startsWith("feedback_")) {
    return <FeedbackTable appId={tile.application_id} />;
  }
  if (tile.chart_type === "kpi") return <KpiTile tile={tile} />;
  if (tile.chart_type === "table") return <TableTile tile={tile} />;
  return <ChartTile tile={tile} />;
}

function useTileData(tile: Tile) {
  return useQuery({
    queryKey: ["tile-data", tile.id, tile.sql_query, tile.chart_type],
    queryFn: () =>
      api.runQuery(tile.application_id, {
        sql_query: tile.sql_query,
        chart_type: tile.chart_type,
        x_key: tile.x_key ?? undefined,
        y_key: tile.y_key ?? undefined,
      }),
    refetchInterval: (tile.refresh_seconds ?? 120) * 1000,
    staleTime: ((tile.refresh_seconds ?? 120) - 5) * 1000,
  });
}

function ChartTile({ tile }: { tile: Tile }) {
  const { data, isLoading, isError } = useTileData(tile);
  if (isLoading)
    return (
      <div className="h-full flex items-center justify-center text-xs text-muted-foreground animate-pulse">
        Loading…
      </div>
    );
  if (isError || !data)
    return (
      <div className="h-full flex items-center justify-center text-xs text-destructive">
        Failed to load
      </div>
    );
  const type: "bar" | "line" | "funnel" =
    tile.chart_type === "line" || tile.chart_type === "funnel" ? tile.chart_type : "bar";
  return (
    <div className="h-full px-3 pb-3 pt-1">
      <ChartRenderer
        type={type}
        xKey={tile.x_key ?? "label"}
        yKey={tile.y_key ?? "value"}
        data={data.rows}
        height="100%"
        color={tile.color ?? undefined}
      />
    </div>
  );
}

function KpiTile({ tile }: { tile: Tile }) {
  const { data } = useTileData(tile);
  const yKey = tile.y_key ?? "value";
  const value = data?.rows[0]?.[yKey];
  const display =
    typeof value === "number" ? value.toLocaleString() : value ? String(value) : "—";
  const color =
    typeof tile.color === "number" ? `oklch(0.58 0.22 ${tile.color})` : "var(--primary)";
  return (
    <div className="p-5 h-full flex flex-col justify-center">
      <div className="kpi-number text-4xl" style={{ color }}>
        {display}
      </div>
      <div className="text-xs text-muted-foreground font-mono mt-1">{yKey}</div>
    </div>
  );
}

function TableTile({ tile }: { tile: Tile }) {
  const { data, isLoading } = useTileData(tile);
  if (isLoading)
    return (
      <div className="p-4 text-xs text-muted-foreground animate-pulse">Loading…</div>
    );
  const cols = data?.columns ?? [];
  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-surface text-muted-foreground">
          <tr className="text-left">
            {cols.map((c) => (
              <th key={c} className="px-3 py-2 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(data?.rows ?? []).map((r, i) => (
            <tr key={i} className="border-t border-border/60">
              {cols.map((c) => (
                <td key={c} className="px-3 py-1.5 font-mono">
                  {String(r[c] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
