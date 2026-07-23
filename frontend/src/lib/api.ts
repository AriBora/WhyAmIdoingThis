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
// The base URL is read from VITE_BACKEND_URL. When the backend is
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

import { BACKEND_URL } from "./config";

const BASE = BACKEND_URL.replace(/\/$/, "");

function getMockFallback<T>(path: string): T {
    if (path.includes("/applications/")) {
        if (path.includes("/schema")) {
            return {
                events: {
                    columns: [
                        { name: "name", type: "text", description: "Event name" },
                        { name: "screen_name", type: "text", description: "Screen or page name" },
                        { name: "ts", type: "timestamp", description: "Event timestamp" },
                    ],
                    event_names: ["page_view", "button_click", "signup", "checkout"],
                    sample_properties: ["screen_name", "item_id", "visitor_id"],
                },
                feedback: {
                    columns: [
                        { name: "topic", type: "text", description: "Feedback category" },
                        { name: "message", type: "text", description: "User message" },
                    ],
                    topics: ["General", "Bug Report", "Feature Request", "UI/UX"],
                },
            } as T;
        }
        if (path.includes("/tiles")) {
            return [
                {
                    id: "demo_tile_1",
                    application_id: "demo-bank",
                    title: "Daily Events",
                    x: 0,
                    y: 0,
                    w: 6,
                    h: 4,
                    chart_type: "bar",
                    sql_query: "SELECT DATE(created_at) as date, COUNT(*) as total FROM events GROUP BY 1",
                    x_key: "date",
                    y_key: "total",
                },
                {
                    id: "demo_tile_2",
                    application_id: "demo-bank",
                    title: "User Signups",
                    x: 6,
                    y: 0,
                    w: 6,
                    h: 4,
                    chart_type: "line",
                    sql_query: "SELECT DATE(created_at) as date, COUNT(*) as total FROM signups GROUP BY 1",
                    x_key: "date",
                    y_key: "total",
                },
            ] as T;
        }
        if (path.includes("/feedback")) {
            return { rows: [], total: 0 } as T;
        }
        if (path.includes("/query")) {
            return {
                columns: ["date", "total"],
                rows: [
                    { date: "2026-07-20", total: 120 },
                    { date: "2026-07-21", total: 185 },
                    { date: "2026-07-22", total: 240 },
                    { date: "2026-07-23", total: 310 },
                ],
            } as T;
        }
        if (path.includes("/chat")) {
            return {
                text: "The backend FastAPI server is currently unreachable. Start it with `python main.py` or `uvicorn main:app --reload` inside `backend/` to activate the AI analyst agent.",
            } as T;
        }
        if (path.includes("/custom-chart")) {
            return {
                tile: {
                    id: newTileId(),
                    application_id: "demo-bank",
                    title: "Generated Chart",
                    x: 0,
                    y: 0,
                    w: 6,
                    h: 4,
                    chart_type: "bar" as ChartType,
                    sql_query: "SELECT 1",
                },
                title: "Generated Chart",
                chartType: "bar" as ChartType,
                xKey: "date",
                yKey: "total",
                sql: "SELECT 1",
                data: [],
            } as T;
        }
    }
    if (path === "/applications") {
        return [
            {
                id: "demo-bank",
                site_id: "demo-bank",
                name: "Demo Bank App",
                description: "Financial analytics demo",
            },
        ] as T;
    }
    return [] as T;
}

async function req<T>(
    path: string,
    init?: RequestInit,
): Promise<T> {
    try {
        const res = await fetch(`${BASE}${path}`, {
            headers: { "content-type": "application/json" },
            ...init,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as T;
    } catch (err) {
        console.warn(`[api] Backend server at ${BASE} unreachable for ${path}. Using fallback mock.`);
        return getMockFallback<T>(path);
    }
}

// ---------- API surface ----------

export const api = {
    async listApplications() {
        return req<Application[]>("/applications");
    },
    async getSchema(appId: string) {
        return req<AppSchema>(`/applications/${appId}/schema`);
    },
    async listTiles(appId: string) {
        return req<Tile[]>(`/applications/${appId}/tiles`);
    },
    async createTile(appId: string, tile: Omit<Tile, "id" | "application_id">) {
        return req<Tile>(
            `/applications/${appId}/tiles`,
            { method: "POST", body: JSON.stringify(tile) },
        );
    },
    async updateTile(tileId: string, patch: Partial<Tile>) {
        return req<Tile>(
            `/tiles/${tileId}`,
            { method: "PATCH", body: JSON.stringify(patch) },
        );
    },
    async deleteTile(tileId: string) {
        return req<{ ok: boolean }>(
            `/tiles/${tileId}`,
            { method: "DELETE" },
        );
    },
    async runQuery(
        appId: string,
        body: { sql_query: string; chart_type?: ChartType; x_key?: string; y_key?: string },
    ) {
        return req<QueryResult>(
            `/applications/${appId}/query`,
            { method: "POST", body: JSON.stringify(body) },
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
        );
    },
    async chat(
        appId: string,
        messages: Array<{ role: "user" | "assistant"; content: string }>,
    ) {
        return req<{
            text: string;
            charts?: Array<{
                type: "bar" | "line" | "funnel";
                title?: string;
                xKey: string;
                yKey: string;
                data: Array<Record<string, unknown>>;
            }>;
        }>(`/applications/${appId}/chat`, {
            method: "POST",
            body: JSON.stringify({ messages }),
        });
    },
    async customChart(
        appId: string,
        prompt: string,
    ) {
        return req<{
            tile: Tile;
            title: string;
            chartType: ChartType;
            xKey: string;
            yKey: string;
            sql: string;
            data: Array<Record<string, unknown>>;
        }>(`/applications/${appId}/custom-chart`, {
            method: "POST",
            body: JSON.stringify({ prompt, application_id: appId }),
        });
    },
};

export function newTileId() {
    return `local_${Math.random().toString(36).slice(2, 9)}`;
}