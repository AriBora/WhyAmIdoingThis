import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Trash2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, type ChartType, type Tile } from "@/lib/api";

const TYPES: ChartType[] = ["bar", "line", "funnel", "kpi", "table"];

export function TileCustomizePopover({ tile }: { tile: Tile }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Tile>(tile);

  const update = useMutation({
    mutationFn: (patch: Partial<Tile>) => api.updateTile(tile.id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tiles", tile.application_id] }),
  });

  const del = useMutation({
    mutationFn: () => api.deleteTile(tile.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tiles", tile.application_id] }),
  });

  function commit(patch: Partial<Tile>) {
    setDraft((d) => ({ ...d, ...patch }));
    update.mutate(patch);
  }

  const isFeedback = tile.id.startsWith("feedback_") || tile.sql_query === "__feedback__";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="text-muted-foreground/70 hover:text-foreground p-1 rounded"
          title="Customize"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Title</Label>
          <Input
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            onBlur={() => draft.title !== tile.title && commit({ title: draft.title })}
            className="h-8"
          />
        </div>
        {!isFeedback && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">Chart type</Label>
              <Select
                value={draft.chart_type}
                onValueChange={(v) => commit({ chart_type: v as ChartType })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">X key</Label>
                <Input
                  value={draft.x_key ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, x_key: e.target.value }))}
                  onBlur={() =>
                    draft.x_key !== tile.x_key && commit({ x_key: draft.x_key })
                  }
                  className="h-8"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Y key</Label>
                <Input
                  value={draft.y_key ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, y_key: e.target.value }))}
                  onBlur={() =>
                    draft.y_key !== tile.y_key && commit({ y_key: draft.y_key })
                  }
                  className="h-8"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">SQL</Label>
              <Textarea
                value={draft.sql_query}
                onChange={(e) => setDraft((d) => ({ ...d, sql_query: e.target.value }))}
                onBlur={() =>
                  draft.sql_query !== tile.sql_query &&
                  commit({ sql_query: draft.sql_query })
                }
                rows={4}
                className="font-mono text-[11px]"
              />
            </div>
          </>
        )}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Color</Label>
            <span
              className="w-4 h-4 rounded-full border border-border"
              style={{ background: `oklch(0.58 0.22 ${draft.color ?? 265})` }}
            />
          </div>
          <Slider
            min={0}
            max={360}
            step={1}
            value={[draft.color ?? 265]}
            onValueChange={(v) => setDraft((d) => ({ ...d, color: v[0] }))}
            onValueCommit={(v) => commit({ color: v[0] })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">
            Refresh interval · {draft.refresh_seconds ?? 120}s
          </Label>
          <Slider
            min={5}
            max={300}
            step={5}
            value={[draft.refresh_seconds ?? 120]}
            onValueChange={(v) => setDraft((d) => ({ ...d, refresh_seconds: v[0] }))}
            onValueCommit={(v) => commit({ refresh_seconds: v[0] })}
          />
        </div>
        <div className="pt-2 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            disabled={isFeedback}
            className="w-full gap-2 text-destructive hover:text-destructive disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={() => {
              if (confirm(`Delete "${tile.title}"?`)) del.mutate();
            }}
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete tile
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
