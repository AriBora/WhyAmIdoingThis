import { useSyncExternalStore } from "react";

export type UIPrefs = {
    theme: "light" | "dark";
    accentHue: number;
    currentAppId: string | null;
};

const KEY = "pulse.ui-prefs.v1";
const DEFAULT: UIPrefs = { theme: "light", accentHue: 265, currentAppId: null };

let state: UIPrefs = DEFAULT;
let loaded = false;
const listeners = new Set<() => void>();

function load(): UIPrefs {
    if (typeof window === "undefined") return DEFAULT;
    try {
        const raw = window.localStorage.getItem(KEY);
        if (!raw) return DEFAULT;
        return { ...DEFAULT, ...(JSON.parse(raw) as Partial<UIPrefs>) };
    } catch {
        return DEFAULT;
    }
}

function ensure() {
    if (loaded || typeof window === "undefined") return;
    state = load();
    loaded = true;
}

function persist() {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
        /* noop */
    }
}

function set(next: Partial<UIPrefs>) {
    state = { ...state, ...next };
    persist();
    for (const l of listeners) l();
}

export const uiPrefs = {
    subscribe(fn: () => void) {
        ensure();
        listeners.add(fn);
        return () => listeners.delete(fn);
    },
    get(): UIPrefs {
        ensure();
        return state;
    },
    getServer(): UIPrefs {
        return DEFAULT;
    },
    setTheme(t: "light" | "dark") {
        set({ theme: t });
    },
    setAccentHue(h: number) {
        set({ accentHue: h });
    },
    setCurrentAppId(id: string | null) {
        set({ currentAppId: id });
    },
};

export function useUIPrefs(): UIPrefs {
    return useSyncExternalStore(uiPrefs.subscribe, uiPrefs.get, uiPrefs.getServer);
}
