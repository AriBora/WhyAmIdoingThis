import { createServerFn } from "@tanstack/react-start";

// Deterministic-ish random helpers so numbers look plausible but vary per load.
function rand(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

export const getDashboardStats = createServerFn({ method: "GET" }).handler(
  async () => {
    const steps = [
      "Start",
      "Personal info",
      "Employment",
      "Income",
      "Review",
      "Submit",
    ];

    // Descending funnel
    let current = rand(1800, 2400);
    const funnel = steps.map((name, i) => {
      if (i > 0) current = Math.floor(current * (0.65 + Math.random() * 0.2));
      return {
        step_number: i + 1,
        step_name: name,
        sessions: current,
      };
    });

    // Daily sessions – last 7 days
    const today = new Date();
    const dailySessions = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      return {
        day: d.toISOString().slice(0, 10),
        sessions: rand(240, 720),
      };
    });

    const formErrors = [
      { field: "ssn", errors: rand(80, 160) },
      { field: "email", errors: rand(60, 130) },
      { field: "phone", errors: rand(40, 110) },
      { field: "annual_income", errors: rand(30, 90) },
      { field: "address", errors: rand(25, 80) },
      { field: "date_of_birth", errors: rand(20, 70) },
      { field: "zip_code", errors: rand(15, 60) },
      { field: "employer_name", errors: rand(10, 50) },
    ].sort((a, b) => b.errors - a.errors);

    // Biggest drop-off
    let biggestDropStep: string | null = null;
    let biggestDropCount = 0;
    for (let i = 0; i < funnel.length - 1; i++) {
      const drop = funnel[i].sessions - funnel[i + 1].sessions;
      if (drop > biggestDropCount) {
        biggestDropCount = drop;
        biggestDropStep = `${funnel[i].step_name} → ${funnel[i + 1].step_name}`;
      }
    }

    const started = funnel[0].sessions;
    const completed = funnel[funnel.length - 1].sessions;
    const completionRate = (completed / started) * 100;

    return {
      ok: true as const,
      kpis: {
        sessions7d: dailySessions.reduce((s, d) => s + d.sessions, 0),
        activeNow: rand(8, 42),
        completionRate,
        biggestDropStep: biggestDropStep ?? "—",
        biggestDropCount,
      },
      funnel,
      dailySessions,
      formErrors,
    };
  },
);
