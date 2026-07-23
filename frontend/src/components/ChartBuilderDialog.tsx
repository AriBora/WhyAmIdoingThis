import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LineChart, BarChart3, Filter, Play, Plus, Sparkles } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, type ChartType, type QueryResult } from "@/lib/api";
import { ChartRenderer } from "@/components/ChartRenderer";

type AIPreview = Awaited<ReturnType<typeof api.customChart>>;

const AI_EXAMPLES = [
    "Sessions per day, last 14 days",
    "Top 8 pages by page_view this week",
    "Funnel of the loan_application flow",
    "Top form_error fields as a bar chart",
];

export function ChartBuilderDialog({ appId }: { appId: string }) {
    const [open, setOpen] = useState(false);
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                    <Plus className="w-4 h-4" /> Add chart
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Add a chart</DialogTitle>
                    <DialogDescription>
                        Ask AI to generate one, or build it manually with SQL.
                    </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="ai" className="w-full">
                    <TabsList className="grid grid-cols-2 w-full">
                        <TabsTrigger value="ai" className="gap-2">
                            <Sparkles className="w-3.5 h-3.5" /> AI
                        </TabsTrigger>
                        <TabsTrigger value="manual" className="gap-2">
                            <Filter className="w-3.5 h-3.5" /> Manual
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="ai">
                        <AIBuilder appId={appId} onDone={() => setOpen(false)} />
                    </TabsContent>
                    <TabsContent value="manual">
                        <ManualBuilder appId={appId} onDone={() => setOpen(false)} />
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

function AIBuilder({ appId, onDone }: { appId: string; onDone: () => void }) {
    const qc = useQueryClient();
    const [prompt, setPrompt] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [preview, setPreview] = useState<AIPreview | null>(null);

    async function generatePreview() {
        const p = prompt.trim();
        if (!p) return;
        setLoading(true);
        setError(null);
        try {
            setPreview(await api.customChart(appId, p));
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }

    async function addToDashboard() {
        if (!preview || saving) return;
        setSaving(true);
        setError(null);
        try {
            await api.createTile(appId, {
                title: preview.title,
                chart_type: preview.chartType,
                sql_query: preview.sql,
                x_key: preview.xKey,
                y_key: preview.yKey,
                x: 0,
                y: 9999,
                w: 6,
                h: 8,
            });
            qc.invalidateQueries({ queryKey: ["tiles", appId] });
            onDone();
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="space-y-3 pt-2">
            <Label>Describe the chart</Label>
            <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Bar chart of top 10 pages by unique visitors, last 7 days"
                rows={4}
                disabled={loading || saving}
            />
            <div className="flex flex-wrap gap-1.5">
                {AI_EXAMPLES.map((ex) => (
                    <button
                        key={ex}
                        onClick={() => setPrompt(ex)}
                        disabled={loading || saving}
                        className="text-[11px] px-2 py-1 rounded-md border border-border bg-surface-2 hover:border-primary/50 transition"
                    >
                        {ex}
                    </button>
                ))}
            </div>
            {error && <div className="text-xs text-destructive">⚠️ {error}</div>}
            <DialogFooter>
                <Button className="hidden" onClick={generatePreview} disabled={loading || !prompt.trim()}>
                    {loading ? "Generating…" : "Add to dashboard"}
                </Button>
                <Button variant="outline" onClick={generatePreview} disabled={loading || saving || !prompt.trim()}>
                    {loading ? "Generating preview..." : "Generate preview"}
                </Button>
                <Button onClick={addToDashboard} disabled={!preview || loading || saving}>
                    {saving ? "Adding..." : "Add to dashboard"}
                </Button>
            </DialogFooter>
            {preview && (
                <div className="rounded-lg border border-border bg-surface-2 p-3">
                    <div className="mb-2 text-xs font-semibold">Preview: {preview.title}</div>
                    {preview.chartType === "bar" || preview.chartType === "line" || preview.chartType === "funnel" ? (
                        <ChartRenderer
                            type={preview.chartType}
                            xKey={preview.xKey}
                            yKey={preview.yKey}
                            data={preview.data}
                            height={220}
                        />
                    ) : (
                        <div className="text-xs text-muted-foreground">
                            {preview.data.length} row{preview.data.length === 1 ? "" : "s"} returned
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

const CHART_TYPES: { value: ChartType; label: string; icon: React.ReactNode }[] = [
    { value: "bar", label: "Bar", icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { value: "line", label: "Line", icon: <LineChart className="w-3.5 h-3.5" /> },
    { value: "funnel", label: "Funnel", icon: <Filter className="w-3.5 h-3.5" /> },
    { value: "kpi", label: "KPI", icon: <span className="text-[10px] font-mono">#</span> },
    { value: "table", label: "Table", icon: <span className="text-[10px] font-mono">≡</span> },
];

function ManualBuilder({ appId, onDone }: { appId: string; onDone: () => void }) {
    const qc = useQueryClient();
    const { data: schema } = useQuery({
        queryKey: ["schema", appId],
        queryFn: () => api.getSchema(appId),
    });

    const [title, setTitle] = useState("New chart");
    const [chartType, setChartType] = useState<ChartType>("bar");
    const [table, setTable] = useState<"events" | "feedback">("events");
    const [groupBy, setGroupBy] = useState<string>("name");
    const [metric, setMetric] = useState<"count" | "count_distinct">("count");
    const [distinctCol, setDistinctCol] = useState<string>("visitor_id");
    const [limit, setLimit] = useState<number>(10);
    const [order, setOrder] = useState<"asc" | "desc">("desc");
    const [preview, setPreview] = useState<QueryResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const cols = schema
        ? (table === "events" ? schema.events.columns : schema.feedback.columns).filter(
            (c) => c.name !== "application_id",
        )
        : [];

    const xKey = "label";
    const yKey = "value";

    // Fixed application_id — user cannot change it, and cross-app data is not selectable.
    const sql = buildSql({ appId, table, groupBy, metric, distinctCol, limit, order });

    const runPreview = useMutation({
        mutationFn: () =>
            api.runQuery(appId, { sql_query: sql, chart_type: chartType, x_key: xKey, y_key: yKey }),
        onSuccess: (r) => {
            setPreview(r);
            setError(null);
        },
        onError: (e: Error) => setError(e.message),
    });

    const save = useMutation({
        mutationFn: () =>
            api.createTile(appId, {
                title,
                chart_type: chartType,
                sql_query: sql,
                x_key: xKey,
                y_key: yKey,
                x: 0,
                y: 9999,
                w: 6,
                h: 8,
            }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["tiles", appId] });
            onDone();
        },
    });

    return (
        <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <Label className="text-xs">Title</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs">Chart type</Label>
                    <div className="flex flex-wrap gap-1">
                        {CHART_TYPES.map((t) => (
                            <button
                                key={t.value}
                                onClick={() => setChartType(t.value)}
                                className={`inline-flex items-center gap-1.5 text-xs px-2 h-8 rounded-md border transition ${chartType === t.value
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border hover:border-primary/50"
                                    }`}
                            >
                                {t.icon} {t.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <Label className="text-xs">Table</Label>
                    <select
                        value={table}
                        onChange={(e) => setTable(e.target.value as "events" | "feedback")}
                        className="w-full h-9 rounded-md border border-border bg-background px-2 text-xs"
                    >
                        <option value="events">events</option>
                        <option value="feedback">feedback</option>
                    </select>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs">Group by column</Label>
                    <select
                        value={groupBy}
                        onChange={(e) => setGroupBy(e.target.value)}
                        className="w-full h-9 rounded-md border border-border bg-background px-2 text-xs font-mono"
                    >
                        {cols.map((c) => (
                            <option key={c.name} value={c.name}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                    <Label className="text-xs">Metric</Label>
                    <select
                        value={metric}
                        onChange={(e) => setMetric(e.target.value as "count" | "count_distinct")}
                        className="w-full h-9 rounded-md border border-border bg-background px-2 text-xs"
                    >
                        <option value="count">COUNT(*)</option>
                        <option value="count_distinct">COUNT DISTINCT</option>
                    </select>
                </div>
                {metric === "count_distinct" && (
                    <div className="space-y-1.5">
                        <Label className="text-xs">Distinct column</Label>
                        <select
                            value={distinctCol}
                            onChange={(e) => setDistinctCol(e.target.value)}
                            className="w-full h-9 rounded-md border border-border bg-background px-2 text-xs font-mono"
                        >
                            {cols.map((c) => (
                                <option key={c.name} value={c.name}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                <div className="space-y-1.5">
                    <Label className="text-xs">Limit</Label>
                    <Input
                        type="number"
                        min={1}
                        max={500}
                        value={limit}
                        onChange={(e) => setLimit(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs">Order</Label>
                    <div className="flex gap-1">
                        {(["desc", "asc"] as const).map((o) => (
                            <button
                                key={o}
                                onClick={() => setOrder(o)}
                                className={`flex-1 h-9 rounded-md border text-xs uppercase font-mono transition ${order === o
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border hover:border-primary/50"
                                    }`}
                            >
                                {o}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="rounded-md border border-border bg-surface-2 p-2">
                <div className="text-[10px] font-mono text-muted-foreground mb-1">
                    Generated SQL · application_id is locked to this app
                </div>
                <pre className="text-[11px] font-mono whitespace-pre-wrap text-foreground/80">{sql}</pre>
            </div>

            {error && <div className="text-xs text-destructive">⚠️ {error}</div>}
            {preview && preview.rows.length > 0 && chartType !== "table" && chartType !== "kpi" && (
                <div className="border border-border rounded-lg p-3 bg-surface-2">
                    <ChartRenderer
                        type={chartType === "line" || chartType === "funnel" ? chartType : "bar"}
                        xKey={xKey}
                        yKey={yKey}
                        data={preview.rows}
                        height={200}
                    />
                </div>
            )}
            <DialogFooter className="gap-2">
                <Button
                    variant="outline"
                    onClick={() => runPreview.mutate()}
                    disabled={runPreview.isPending}
                    className="gap-2"
                >
                    <Play className="w-3.5 h-3.5" />
                    {runPreview.isPending ? "Running…" : "Preview"}
                </Button>
                <Button onClick={() => save.mutate()} disabled={save.isPending}>
                    {save.isPending ? "Saving…" : "Add to dashboard"}
                </Button>
            </DialogFooter>
        </div>
    );
}

function buildSql(opts: {
    appId: string;
    table: "events" | "feedback";
    groupBy: string;
    metric: "count" | "count_distinct";
    distinctCol: string;
    limit: number;
    order: "asc" | "desc";
}) {
    const { appId, table, groupBy, metric, distinctCol, limit, order } = opts;
    const safeAppId = appId.replace(/'/g, "''");
    const valueExpr =
        metric === "count_distinct"
            ? `COUNT(DISTINCT "${distinctCol}")::int`
            : `COUNT(*)::int`;
    return `SELECT "${groupBy}" AS label, ${valueExpr} AS value
FROM ${table}
WHERE application_id = (SELECT id FROM applications WHERE site_id = '${safeAppId}')
GROUP BY 1
ORDER BY 2 ${order.toUpperCase()}
LIMIT ${limit}`;
}