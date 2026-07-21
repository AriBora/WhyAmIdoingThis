import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";

declare global {
  interface Window {
    analytics?: { track: (name: string, properties?: Record<string, unknown>) => void };
    __analytics_screen?: string;
    __analytics_active_flow?: { name: string; step: number | string } | null;
  }
}

export function track(name: string, properties?: Record<string, unknown>) {
  if (typeof window !== "undefined" && window.analytics) {
    window.analytics.track(name, properties);
  }
}

export function useScreenView(screenName: string) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__analytics_screen = screenName;
    }
    track("screen_view", { screen_name: screenName });
  }, [screenName]);
}

export function useFlowStep(
  flowName: "loan_application" | "transfer",
  stepNumber: number,
  stepName: string
) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__analytics_active_flow = { name: flowName, step: stepNumber };
    }
    track("flow_step", { flow_name: flowName, step_number: stepNumber, step_name: stepName });
  }, [flowName, stepNumber, stepName]);
}

export function completeFlow(flowName: "loan_application" | "transfer") {
  if (typeof window !== "undefined") {
    window.__analytics_active_flow = null;
  }
  track("flow_completed", { flow_name: flowName });
}

/**
 * Detects when the user navigates away from an active flow to a route that
 * is not part of it, and fires flow_abandoned.
 */
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
      loan_application: "/loan",
      transfer: "/transfer",
    };
    const prefix = prefixes[flow.name];
    // If we're leaving the flow's route subtree, it's abandonment.
    // (completeFlow clears __analytics_active_flow before navigation on success.)
    if (prefix && !pathname.startsWith(prefix)) {
      track("flow_abandoned", { flow_name: flow.name, last_step: flow.step });
      window.__analytics_active_flow = null;
    }
  }, [pathname]);
}