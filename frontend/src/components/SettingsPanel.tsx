import { useState } from "react";
import { Settings, Eye, EyeOff, Trash2, Sun, Moon, RotateCcw } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { dashboardStore, useDashboard, type Tile } from "@/lib/dashboard-store";

const PRESET_HUES: { name: string; hue: number }[] = [
  { name: "Indigo", hue: 265 },
  { name: "Blue", hue: 240 },
  { name: "Cyan", hue: 200 },
  { name: "Emerald", hue: 155 },
  { name: "Amber", hue: 70 },
  { name: "Rose", hue: 15 },
  { name: "Magenta", hue: 335 },
];

export function SettingsPanel() {
  const state = useDashboard();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="w-4 h-4" />
          Customize
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Customize dashboard</SheetTitle>
          <SheetDescription>
            Theme, accent color, and per-tile controls. Saved to this browser.
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 space-y-6 pb-8">
          <section className="space-y-3">
            <Label>Theme</Label>
            <div className="flex gap-2">
              <Button
                variant={state.theme === "light" ? "default" : "outline"}
                size="sm"
                className="gap-2"
                onClick={() => dashboardStore.setTheme("light")}
              >
                <Sun className="w-4 h-4" /> Light
              </Button>
              <Button
                variant={state.theme === "dark" ? "default" : "outline"}
                size="sm"
                className="gap-2"
                onClick={() => dashboardStore.setTheme("dark")}
              >
                <Moon className="w-4 h-4" /> Dark
              </Button>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Accent color</Label>
              <span
                className="w-6 h-6 rounded-full border border-border"
                style={{ background: `oklch(0.58 0.22 ${state.accentHue})` }}
              />
            </div>
            <Slider
              min={0}
              max={360}
              step={1}
              value={[state.accentHue]}
              onValueChange={(v) => dashboardStore.setAccentHue(v[0] ?? 265)}
            />
            <div className="flex flex-wrap gap-2">
              {PRESET_HUES.map((p) => (
                <button
                  key={p.hue}
                  onClick={() => dashboardStore.setAccentHue(p.hue)}
                  className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border border-border hover:border-primary transition"
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ background: `oklch(0.58 0.22 ${p.hue})` }}
                  />
                  {p.name}
                </button>
              ))}
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Tiles</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm("Reset dashboard to defaults?")) dashboardStore.reset();
                }}
                className="gap-1.5 text-xs h-7"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </Button>
            </div>
            <div className="space-y-2">
              {state.tiles.map((t) => (
                <TileRow key={t.id} tile={t} />
              ))}
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function TileRow({ tile }: { tile: Tile }) {
  const canColor = tile.kind !== "chat" && !tile.kind.startsWith("kpi");
  return (
    <div className="border border-border rounded-lg p-3 space-y-2 bg-surface">
      <div className="flex items-center gap-2">
        <Input
          value={tile.title}
          onChange={(e) =>
            dashboardStore.updateTile(tile.id, { title: e.target.value })
          }
          className="h-8 text-sm"
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => dashboardStore.toggleHidden(tile.id)}
          title={tile.hidden ? "Show" : "Hide"}
        >
          {tile.hidden ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </Button>
        {tile.kind === "custom" && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-destructive"
            onClick={() => {
              if (confirm(`Delete "${tile.title}"?`))
                dashboardStore.removeTile(tile.id);
            }}
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
      {canColor && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-12">Color</span>
          <input
            type="range"
            min={0}
            max={360}
            value={tile.color ?? 265}
            onChange={(e) =>
              dashboardStore.updateTile(tile.id, { color: Number(e.target.value) })
            }
            className="flex-1 accent-primary"
          />
          <button
            onClick={() =>
              dashboardStore.updateTile(tile.id, { color: undefined })
            }
            className="text-[10px] text-muted-foreground hover:text-foreground"
            title="Use accent"
          >
            reset
          </button>
          <span
            className="w-5 h-5 rounded-full border border-border"
            style={{
              background: `oklch(0.58 0.22 ${tile.color ?? 265})`,
            }}
          />
        </div>
      )}
    </div>
  );
}
