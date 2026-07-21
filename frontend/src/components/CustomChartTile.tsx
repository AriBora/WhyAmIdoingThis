import { useQuery } from "@tanstack/react-query";
import { ChartRenderer } from "./ChartRenderer";
import type { Tile } from "@/lib/dashboard-store";

type Custom = Extract<Tile, { kind: "custom" }>;

async function fetchCustom(tile: Custom, seed: number) {
  const res = await fetch("/api/custom-chart", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      prompt: tile.prompt,
      sql: tile.sql,
      chartType: tile.chartType,
      xKey: tile.xKey,
      yKey: tile.yKey,
      seed,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as {
    data: Array<Record<string, unknown>>;
    chartType: "bar" | "line" | "funnel";
    xKey: string;
    yKey: string;
  };
}

export function CustomChartTile({ tile }: { tile: Custom }) {
  const { data, isLoading, isError, dataUpdatedAt } = useQuery({
    queryKey: ["custom-chart", tile.id, tile.prompt, tile.sql],
    queryFn: () => fetchCustom(tile, Math.floor(Date.now() / 30000)),
    refetchInterval: 30_000,
    staleTime: 25_000,
  });

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 pb-3 flex-1 min-h-0">
        {isLoading && (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground animate-pulse">
            Generating chart…
          </div>
        )}
        {isError && (
          <div className="h-full flex items-center justify-center text-xs text-destructive">
            Failed to load.
          </div>
        )}
        {data && (
          <div className="h-full">
            <ChartRenderer
              type={data.chartType}
              xKey={data.xKey}
              yKey={data.yKey}
              data={data.data}
              height={Math.max(140, 999)}
              color={tile.color}
            />
          </div>
        )}
      </div>
      {dataUpdatedAt > 0 && (
        <div className="px-4 pb-2 text-[10px] font-mono text-muted-foreground">
          updated {new Date(dataUpdatedAt).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
