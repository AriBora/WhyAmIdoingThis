// Typed client for the FastAPI analytics backend.
// Endpoints (assumed contract, see .lovable/plan.md):
//   GET  /applications
//   GET  /applications/:id/schema
//   GET  /applications/:id/tiles
//   POST /applications/:id/tiles
//   PATCH /tiles/:id
//   DELETE /tiles/:id
//   POST /applications/:id/query           -> { columns, rows }
//   GET  /applications/:id/feedback        -> { rows, total }
//   POST /applications/:id/chat            -> { text, charts }
//
// The base URL is read from VITE_FASTAPI_URL. When the backend is
// unreachable, calls fall back to a deterministic mock so the demo still
// renders.

export type ChartType = "bar" | "line" | "funnel" | "table" | "kpi";

export type Application = {
    id: string;
    site_id: string;
    name: string;
    description?: string | null;
};

export type Column = {
    name: string;
    type: string;
    description?: string;
    distinct_count?: number;
    sample_values?: Array<string | number | boolean | null>;
};

export type AppSchema = {
    events: {
        columns: Column[];
        event_names: string[];
        sample_properties: string[];
    };
    feedback: {
        columns: Column[];
        topics: string[];
    };
};

export type Tile = {
    id: string;
    application_id: string;
    title: string;
    x: number;
    y: number;
    w: number;
    h: number;
    chart_type: ChartType;
    sql_query: string;
    // Optional client-side hints stored on the tile row (backend can persist
    // them in a JSON column or as extra columns). Safe to be undefined.
    x_key?: string | null;
    y_key?: string | null;
    color?: number | null;
    refresh_seconds?: number | null;
};

export type QueryResult = {
    columns: string[];
    rows: Array<Record<string, unknown>>;
};

export type FeedbackRow = {
    id: string | number;
    name: string;
    topic: string;
    email: string;
    page_url: string;
    message: string;
    created_at?: string;
};

const BASE =
    (typeof import.meta !== "undefined" &&
        (import.meta as { env?: Record<string, string> }).env?.VITE_FASTAPI_URL) ||
    "/api/py";

async function req<T>(
    path: string,
    init?: RequestInit,
    fallback?: () => T,
): Promise<T> {
    try {
        const res = await fetch(`${BASE}${path}`, {
            headers: { "content-type": "application/json" },
            ...init,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as T;
    } catch (err) {
        if (fallback) return fallback();
        throw err;
    }
}

// ---------- Mock fallbacks ----------

const MOCK_APPS: Application[] = [
    {
        id: "app_banking",
        site_id: "site_1",
        name: "Demo-Bank",
        description: "Retail banking",
    },
    {
        id: "app_trading",
        site_id: "site_2",
        name: "Demo-Trade",
        description: "Online trading",
    },
];

const MOCK_SCHEMA: AppSchema = {
    events: {
        columns: [
            { name: "id", type: "bigint", distinct_count: 48210, sample_values: [1, 2, 3, 4, 5] },
            { name: "application_id", type: "uuid", distinct_count: 1, sample_values: ["app_banking"] },
            { name: "name", type: "text", description: "event name", distinct_count: 9, sample_values: ["page_view", "session_start", "click", "flow_step", "form_error"] },
            { name: "properties", type: "jsonb", distinct_count: 12043, sample_values: ['{"flow":"loan_application","step":1}', '{"field":"ssn"}', '{"label":"Apply"}', "{}", '{"step":2}'] },
            { name: "url", type: "text", distinct_count: 14, sample_values: ["/loan/start", "/loan/income", "/accounts", "/dashboard", "/settings"] },
            { name: "visitor_id", type: "text", distinct_count: 3421, sample_values: ["v_9f2a", "v_11cd", "v_77b3", "v_2210", "v_4c8e"] },
            { name: "session_id", type: "text", distinct_count: 8907, sample_values: ["s_a12", "s_b44", "s_c77", "s_d09", "s_e51"] },
            { name: "timestamp", type: "timestamptz", distinct_count: 47812, sample_values: ["2026-07-22T14:03:12Z", "2026-07-22T14:03:14Z", "2026-07-22T14:04:01Z", "2026-07-22T14:04:22Z", "2026-07-22T14:05:03Z"] },
        ],
        event_names: [
            "page_view", "session_start", "screen_view", "click", "button_click",
            "form_error", "flow_step", "flow_abandoned", "flow_completed",
        ],
        sample_properties: ["flow_name", "step", "field", "error_message", "label", "value"],
    },
    feedback: {
        columns: [
            { name: "id", type: "bigint", distinct_count: 312, sample_values: [1, 2, 3, 4, 5] },
            { name: "application_id", type: "uuid", distinct_count: 1, sample_values: ["app_banking"] },
            { name: "name", type: "text", distinct_count: 287, sample_values: ["Alex Kim", "Sam Patel", "Jamie Lee", "Riley Chen", "Morgan Diaz"] },
            { name: "topic", type: "text", distinct_count: 5, sample_values: ["Bug", "Feature request", "Praise", "Confusion", "Other"] },
            { name: "email", type: "text", distinct_count: 287, sample_values: ["user123@example.com", "user456@example.com", "user789@example.com", "user221@example.com", "user302@example.com"] },
            { name: "page_url", type: "text", distinct_count: 12, sample_values: ["/loan/start", "/loan/income", "/accounts", "/dashboard", "/settings"] },
            { name: "message", type: "text", distinct_count: 298, sample_values: ["Love the new dashboard", "Got stuck on step 3", "Confusing income step", "Great UI", "Save and finish later?"] },
            { name: "created_at", type: "timestamptz", distinct_count: 312, sample_values: ["2026-07-22T10:03:12Z", "2026-07-21T18:22:41Z", "2026-07-21T09:15:03Z", "2026-07-20T22:44:07Z", "2026-07-20T14:11:59Z"] },
        ],
        topics: ["Bug", "Feature request", "Praise", "Confusion", "Other"],
    },
};

function mockFeedback(appId: string, limit = 50): FeedbackRow[] {
    const names = ["Alex Kim", "Sam Patel", "Jamie Lee", "Riley Chen", "Morgan Diaz", "Casey Novak"];
    const topics = MOCK_SCHEMA.feedback.topics;
    const pages = ["/loan/start", "/loan/income", "/accounts", "/dashboard", "/settings"];
    const msgs = [
        "The income step is confusing, why do you need my employer address?",
        "Love the new dashboard, feels much snappier!",
        "Got stuck on step 3 — clicking Next didn't do anything.",
        "Would be great to save an application and finish later.",
        "The error message on SSN doesn't say what's wrong.",
        "Great experience overall, very clean UI.",
    ];
    let seed = appId.length * 37 + 1;
    const rand = () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed >>> 0;
    };
    return Array.from({ length: Math.min(limit, 40) }).map((_, i) => ({
        id: i + 1,
        name: names[rand() % names.length],
        topic: topics[rand() % topics.length],
        email: `user${rand() % 900 + 100}@example.com`,
        page_url: pages[rand() % pages.length],
        message: msgs[rand() % msgs.length],
        created_at: new Date(Date.now() - (rand() % 604800000)).toISOString(),
    }));
}

function mockQuery(chartType: ChartType, xKey = "label", yKey = "value"): QueryResult {
    const rows: Array<Record<string, unknown>> = [];
    const int = (min: number, max: number) => Math.floor(min + Math.random() * (max - min));
    if (chartType === "line") {
        for (let i = 13; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            rows.push({ [xKey]: d.toISOString().slice(5, 10), [yKey]: int(120, 900) });
        }
    } else if (chartType === "funnel") {
        let cur = int(1500, 2200);
        ["Start", "Identity", "Income", "Review", "Complete"].forEach((n, i) => {
            if (i > 0) cur = Math.floor(cur * (0.55 + Math.random() * 0.3));
            rows.push({ [xKey]: n, [yKey]: cur });
        });
    } else if (chartType === "kpi") {
        rows.push({ [yKey]: int(1000, 9999) });
    } else {
        ["alpha", "beta", "gamma", "delta", "epsilon"].forEach((l) =>
            rows.push({ [xKey]: l, [yKey]: int(20, 250) }),
        );
        rows.sort((a, b) => (b[yKey] as number) - (a[yKey] as number));
    }
    return { columns: Object.keys(rows[0] ?? {}), rows };
}

// ---------- API surface ----------

export const api = {
    async listApplications() {
        return req<Application[]>("/applications", undefined, () => MOCK_APPS);
    },
    async getSchema(appId: string) {
        return req<AppSchema>(`/applications/${appId}/schema`, undefined, () => MOCK_SCHEMA);
    },
    async listTiles(appId: string) {
        return req<Tile[]>(`/applications/${appId}/tiles`, undefined, () => []);
    },
    async createTile(appId: string, tile: Omit<Tile, "id" | "application_id">) {
        return req<Tile>(
            `/applications/${appId}/tiles`,
            { method: "POST", body: JSON.stringify(tile) },
            () => ({
                ...tile,
                id: `local_${Math.random().toString(36).slice(2, 9)}`,
                application_id: appId,
            }),
        );
    },
    async updateTile(tileId: string, patch: Partial<Tile>) {
        return req<Tile>(
            `/tiles/${tileId}`,
            { method: "PATCH", body: JSON.stringify(patch) },
            () => ({ ...(patch as Tile), id: tileId }),
        );
    },
    async deleteTile(tileId: string) {
        return req<{ ok: boolean }>(
            `/tiles/${tileId}`,
            { method: "DELETE" },
            () => ({ ok: true }),
        );
    },
    async runQuery(
        appId: string,
        body: { sql_query: string; chart_type?: ChartType; x_key?: string; y_key?: string },
    ) {
        return req<QueryResult>(
            `/applications/${appId}/query`,
            { method: "POST", body: JSON.stringify(body) },
            () => mockQuery(body.chart_type ?? "bar", body.x_key, body.y_key),
        );
    },
    async listFeedback(
        appId: string,
        params: { limit?: number; topic?: string; search?: string } = {},
    ) {
        const q = new URLSearchParams();
        if (params.limit) q.set("limit", String(params.limit));
        if (params.topic) q.set("topic", params.topic);
        if (params.search) q.set("search", params.search);
        return req<{ rows: FeedbackRow[]; total: number }>(
            `/applications/${appId}/feedback?${q.toString()}`,
            undefined,
            () => {
                const rows = mockFeedback(appId, params.limit ?? 50).filter((r) => {
                    if (params.topic && r.topic !== params.topic) return false;
                    if (
                        params.search &&
                        !`${r.name} ${r.email} ${r.message}`
                            .toLowerCase()
                            .includes(params.search.toLowerCase())
                    )
                        return false;
                    return true;
                });
                return { rows, total: rows.length };
            },
        );
    },
    async chat(
        appId: string,
        messages: Array<{ role: "user" | "assistant"; content: string }>,
    ) {
        // First try FastAPI, fall back to the existing Anthropic route on this app
        // so the chat keeps working when the backend isn't up yet.
        try {
            const res = await fetch(`${BASE}/applications/${appId}/chat`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ messages }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return (await res.json()) as {
                text: string;
                charts?: Array<{
                    type: "bar" | "line" | "funnel";
                    title?: string;
                    xKey: string;
                    yKey: string;
                    data: Array<Record<string, unknown>>;
                }>;
            };
        } catch {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ messages, application_id: appId }),
            });
            const data = (await res.json()) as {
                text?: string;
                charts?: Array<{
                    type: "bar" | "line" | "funnel";
                    title?: string;
                    xKey: string;
                    yKey: string;
                    data: Array<Record<string, unknown>>;
                }>;
                error?: string;
            };
            if (data.error) throw new Error(data.error);
            return { text: data.text ?? "", charts: data.charts };
        }
    },
};

export function newTileId() {
    return `local_${Math.random().toString(36).slice(2, 9)}`;
}
