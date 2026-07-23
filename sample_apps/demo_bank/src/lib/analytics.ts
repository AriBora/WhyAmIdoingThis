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
  // Compatibility aliases used by existing UI handlers. They are normalized
  // below and are not part of the network payload.
  button_label?: string;
  field_name?: string;
  offering_id?: string;
  offering_title?: string;
  holding_id?: string;
  category?: string;
  source?: string;
  account_type?: string;
  redirect?: string;
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
 * Sends a schema-backed event. The second argument is converted to the fixed
 * event columns; it is never sent as a JSON `properties` object.
 */
export function track(name: EventName, fields: TrackingFields = {}) {
  if (typeof window !== "undefined" && window.analytics) {
    const category = fields.category === "investment" ? "investing" : fields.category;
    const itemType = ["credit_card", "debit_card", "loan", "investing", "insurance", "stock"].includes(category || "")
      ? category as TrackingFields["item_type"]
      : undefined;
    window.analytics.track({
      name,
      screen_name: fields.screen_name,
      flow_name: fields.flow_name,
      step_number: fields.step_number,
      step_name: fields.step_name,
      item_type: fields.item_type || itemType,
      item_id: fields.item_id || fields.offering_id || fields.holding_id,
      item_label: fields.item_label || fields.offering_title,
      element_label: fields.element_label || fields.button_label || fields.field_name,
    });
  }
}

/** Call after authentication; every following event carries this user and session. */
export function identifyUser(userId: string | null) {
  if (typeof window !== "undefined" && window.analytics) {
    window.analytics.identify(userId);
  }
}

import { API_BASE_URL } from "./config";

/** Contact messages belong in the dedicated `feedback` table, not in events. */
export function submitFeedback(feedback: { name: string; email: string; topic: string; message: string }) {

  if (typeof window === "undefined") return;
  fetch(`${API_BASE_URL}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...feedback, page_url: window.location.pathname, site_id: "demo-bank" }),
    keepalive: true,
  }).catch(() => undefined);
}

export function useScreenView(screenName: string) {
  useEffect(() => {
    if (typeof window !== "undefined") window.__analytics_screen = screenName;
    track("screen_view", { screen_name: screenName });
  }, [screenName]);
}

export function useFlowStep(flowName: string, stepNumber: number, stepName: string) {
  useEffect(() => {
    if (typeof window !== "undefined") window.__analytics_active_flow = { name: flowName, step: stepNumber };
    track("flow_step", { flow_name: flowName, step_number: stepNumber, step_name: stepName });
  }, [flowName, stepNumber, stepName]);
}

export function completeFlow(flowName: string) {
  if (typeof window !== "undefined") window.__analytics_active_flow = null;
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
    const prefixes: Record<string, string> = { loan_application: "/loan", transfer: "/transfer" };
    if (prefixes[flow.name] && !pathname.startsWith(prefixes[flow.name])) {
      track("flow_abandoned", { flow_name: flow.name, step_number: flow.step });
      window.__analytics_active_flow = null;
    }
  }, [pathname]);
}