import { useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { dashboardStore, newId, type ChartType } from "@/lib/dashboard-store";

const EXAMPLES = [
  "Sessions per day for the last 14 days",
  "Top 8 pages by page_views this week",
  "Funnel of the onboarding flow",
  "Button clicks by label, last 7 days",
];

export function AddChartDialog() {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const p = prompt.trim();
    if (!p) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/custom-chart", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: p }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const spec = (await res.json()) as {
        title: string;
        chartType: ChartType;
        xKey: string;
        yKey: string;
        sql: string | null;
      };
      dashboardStore.addCustomTile({
        id: newId("custom"),
        kind: "custom",
        title: spec.title || p,
        prompt: p,
        chartType: spec.chartType,
        xKey: spec.xKey,
        yKey: spec.yKey,
        sql: spec.sql,
      });
      setPrompt("");
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Add chart
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Add a chart with AI
          </DialogTitle>
          <DialogDescription>
            Describe the chart you want. The LLM will design it, run a
            read-only SQL query, and pin it to your dashboard with a 30s auto-refresh.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Bar chart of the top 10 pages by unique visitors, last 7 days"
            rows={4}
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
          />
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setPrompt(ex)}
                disabled={loading}
                className="text-[11px] px-2 py-1 rounded-md border border-border bg-surface-2 hover:border-primary/50 transition"
              >
                {ex}
              </button>
            ))}
          </div>
          {error && (
            <div className="text-xs text-destructive">⚠️ {error}</div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={loading || !prompt.trim()}>
            {loading ? "Generating…" : "Add to dashboard"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
