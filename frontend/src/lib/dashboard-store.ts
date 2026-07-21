import { useSyncExternalStore } from "react";
import type { LayoutItem } from "react-grid-layout";

export type ChartType = "bar" | "line" | "funnel";

export type BuiltinKind =
  | "kpi-sessions"
  | "kpi-active"
  | "kpi-completion"
  | "kpi-dropoff"
  | "chart-funnel"
  | "chart-daily"
  | "chart-errors"
  | "chat";

export type Tile =
  | {
      id: string;
      kind: BuiltinKind;
      title: string;
      hidden?: boolean;
      color?: number;
    }
  | {
      id: string;
      kind: "custom";
      title: string;
      hidden?: boolean;
      color?: number;
      prompt: string;
      chartType: ChartType;
      xKey: string;
      yKey: string;
      sql?: string | null;
    };

export type DashboardState = {
  theme: "light" | "dark";
  accentHue: number;
  tiles: Tile[];
  layout: LayoutItem[];
};

const STORAGE_KEY = "pulse.dashboard.v3";

const DEFAULT_TILES: Tile[] = [
  { id: "kpi-sessions", kind: "kpi-sessions", title: "Sessions · last 7d" },
  { id: "kpi-active", kind: "kpi-active", title: "Active users now" },
  { id: "kpi-completion", kind: "kpi-completion", title: "Loan completion" },
  { id: "kpi-dropoff", kind: "kpi-dropoff", title: "Biggest drop-off" },
  { id: "chart-funnel", kind: "chart-funnel", title: "Loan application funnel" },
  { id: "chart-daily", kind: "chart-daily", title: "Daily sessions" },
  { id: "chart-errors", kind: "chart-errors", title: "Top form-error fields" },
  { id: "chat", kind: "chat", title: "Ask the analyst" },
];

// 12 cols, rowHeight ~40px
const DEFAULT_LAYOUT: LayoutItem[] = [
  { i: "kpi-sessions", x: 0, y: 0, w: 2, h: 3 },
  { i: "kpi-active", x: 2, y: 0, w: 2, h: 3 },
  { i: "kpi-completion", x: 4, y: 0, w: 2, h: 3 },
  { i: "kpi-dropoff", x: 6, y: 0, w: 2, h: 3 },
  { i: "chart-funnel", x: 0, y: 3, w: 4, h: 7 },
  { i: "chart-daily", x: 4, y: 3, w: 4, h: 7 },
  { i: "chart-errors", x: 0, y: 10, w: 8, h: 7 },
  { i: "chat", x: 8, y: 0, w: 4, h: 17 },
];

const DEFAULT_STATE: DashboardState = {
  theme: "light",
  accentHue: 265,
  tiles: DEFAULT_TILES,
  layout: DEFAULT_LAYOUT,
};

let state: DashboardState = DEFAULT_STATE;
const listeners = new Set<() => void>();
let loaded = false;

function load(): DashboardState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<DashboardState>;
    return {
      theme: parsed.theme ?? "light",
      accentHue: typeof parsed.accentHue === "number" ? parsed.accentHue : 265,
      tiles: parsed.tiles ?? DEFAULT_TILES,
      layout: parsed.layout ?? DEFAULT_LAYOUT,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* noop */
  }
}

function emit() {
  for (const l of listeners) l();
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  state = load();
  loaded = true;
}

function setState(updater: (s: DashboardState) => DashboardState) {
  state = updater(state);
  persist();
  emit();
}

export const dashboardStore = {
  subscribe(fn: () => void) {
    ensureLoaded();
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  getSnapshot(): DashboardState {
    ensureLoaded();
    return state;
  },
  getServerSnapshot(): DashboardState {
    return DEFAULT_STATE;
  },
  setTheme(theme: "light" | "dark") {
    setState((s) => ({ ...s, theme }));
  },
  setAccentHue(hue: number) {
    setState((s) => ({ ...s, accentHue: hue }));
  },
  updateTile(id: string, patch: Partial<Tile>) {
    setState((s) => ({
      ...s,
      tiles: s.tiles.map((t) => (t.id === id ? ({ ...t, ...patch } as Tile) : t)),
    }));
  },
  toggleHidden(id: string) {
    setState((s) => ({
      ...s,
      tiles: s.tiles.map((t) => (t.id === id ? { ...t, hidden: !t.hidden } : t)),
    }));
  },
  removeTile(id: string) {
    setState((s) => ({
      ...s,
      tiles: s.tiles.filter((t) => t.id !== id),
      layout: s.layout.filter((l) => l.i !== id),
    }));
  },
  addCustomTile(tile: Extract<Tile, { kind: "custom" }>) {
    const item: LayoutItem = { i: tile.id, x: 0, y: 9999, w: 4, h: 7 };
    setState((s) => ({
      ...s,
      tiles: [...s.tiles, tile],
      layout: [...s.layout, item],
    }));
  },
  setLayout(layout: readonly LayoutItem[]) {
    setState((s) => ({ ...s, layout: layout.map((l) => ({ ...l })) }));
  },
  reset() {
    setState(() => ({ ...DEFAULT_STATE, tiles: [...DEFAULT_TILES], layout: [...DEFAULT_LAYOUT] }));
  },
};

export function useDashboard(): DashboardState {
  return useSyncExternalStore(
    dashboardStore.subscribe,
    dashboardStore.getSnapshot,
    dashboardStore.getServerSnapshot,
  );
}

export function newId(prefix = "tile") {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}
