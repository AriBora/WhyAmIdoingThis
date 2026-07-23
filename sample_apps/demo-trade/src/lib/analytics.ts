import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";

export type EventName =
  | "screen_view"
  | "offering_click"
  | "flow_step"
  | "flow_abandoned"
  | "flow_completed"
  | "watchlist_add"
  | "watchlist_remove"
  | "form_error"
  | "button_click";

export type TrackingFields = {
  screen_name?: string;
  flow_name?: string;
  step_number?: number;
  step_name?: string;
  item_type?: "credit_card" | "debit_card" | "loan" | "investing" | "insurance" | "stock";
  item_id?: string;
  item_label?: string;
  element_label?: string;

  // Compatibility aliases used by existing UI handlers
  button_label?: string;
  field_name?: string;
  ticker?: string;
  offering_id?: string;
  offering_title?: string;
  holding_id?: string;
};

declare global {
  interface Window {
    analytics?: {
      track: (event: { name: EventName } & TrackingFields) => void;
      identify: (visitorId: string | null) => void;
    };
    __analytics_screen?: string;
    __analytics_active_flow?: { name: string; step: number } | null;
  }
}

/**
 * Sends a schema-backed event to tracker.js.
 */
export function track(name: EventName, fields: TrackingFields = {}) {
  if (typeof window !== "undefined" && window.analytics) {
    const itemId = fields.item_id || fields.ticker || fields.offering_id || fields.holding_id;
    const itemType = fields.item_type || (fields.ticker ? "stock" : undefined);

    window.analytics.track({
      name,
      screen_name: fields.screen_name,
      flow_name: fields.flow_name,
      step_number: fields.step_number,
      step_name: fields.step_name,
      item_type: itemType,
      item_id: itemId,
      item_label: fields.item_label || fields.offering_title || itemId,
      element_label: fields.element_label || fields.button_label || fields.field_name,
    });
  }
}

/** Call after authentication; every following event carries this user identifier. */
export function identifyUser(userId: string | null) {
  if (typeof window !== "undefined" && window.analytics) {
    window.analytics.identify(userId);
  }
}

const BACKEND_URL =
  (typeof import.meta !== "undefined" &&
    (import.meta.env?.BACKEND_URL));

/** Contact / support feedback posted directly to backend /feedback table */
export function submitFeedback(feedback: { name: string; email: string; topic: string; message: string }) {
  if (typeof window === "undefined") return;
  fetch(`${BACKEND_URL}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...feedback, page_url: window.location.pathname, site_id: "demo-trade" }),
    keepalive: true,
  }).catch(() => undefined);
}

export function useScreen(name: string) {
  useEffect(() => {
    if (typeof window !== "undefined") window.__analytics_screen = name;
    track("screen_view", { screen_name: name });
  }, [name]);
}

export function useScreenView(name: string) {
  useScreen(name);
}

export function setFlow(name: string, step: number) {
  if (typeof window !== "undefined") window.__analytics_active_flow = { name, step };
}

export function clearFlow() {
  if (typeof window !== "undefined") window.__analytics_active_flow = null;
}

export function flowStep(flow: string, step: number, stepName: string) {
  setFlow(flow, step);
  track("flow_step", { flow_name: flow, step_number: step, step_name: stepName });
}

export function useFlowStep(flowName: string, stepNumber: number, stepName: string) {
  useEffect(() => {
    flowStep(flowName, stepNumber, stepName);
  }, [flowName, stepNumber, stepName]);
}

export function completeFlow(flowName: string) {
  clearFlow();
  track("flow_completed", { flow_name: flowName });
}

export function useFlowAbandonmentWatcher() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const prev = useRef<string | null>(null);

  useEffect(() => {
    const previous = prev.current;
    prev.current = pathname;
    if (!previous || previous === pathname) return;

    const flow = typeof window !== "undefined" ? window.__analytics_active_flow : null;
    if (!flow) return;

    const prefixes: Record<string, string> = {
      buy_order: "/trade",
      sell_order: "/trade",
      deposit: "/deposit",
    };

    if (prefixes[flow.name] && !pathname.startsWith(prefixes[flow.name])) {
      track("flow_abandoned", { flow_name: flow.name, step_number: flow.step });
      if (typeof window !== "undefined") window.__analytics_active_flow = null;
    }
  }, [pathname]);
}