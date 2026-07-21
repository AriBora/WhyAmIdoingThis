import { createFileRoute } from "@tanstack/react-router";
import Anthropic from "@anthropic-ai/sdk";
import { SCHEMA_PROMPT } from "@/lib/schema-prompt";

const MODEL = "claude-sonnet-4-5";

type ReqBody = {
  prompt: string;
  sql?: string;
  chartType?: "bar" | "line" | "funnel";
  xKey?: string;
  yKey?: string;
  seed?: number;
};

type Spec = {
  title: string;
  chartType: "bar" | "line" | "funnel";
  xKey: string;
  yKey: string;
  sql: string | null;
  data: Array<Record<string, unknown>>;
};

// Deterministic-ish mock generator based on prompt+seed so refreshes vary slightly.
function mockDataFor(
  chartType: "bar" | "line" | "funnel",
  xKey: string,
  yKey: string,
  seed: number,
): Array<Record<string, unknown>> {
  const rand = (n: number) => {
    // simple LCG
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return (seed >>> 0) / 4294967296 * n;
  };
  const int = (min: number, max: number) => Math.floor(min + rand(max - min));

  if (chartType === "line") {
    const today = new Date();
    return Array.from({ length: 14 }).map((_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (13 - i));
      return {
        [xKey]: d.toISOString().slice(5, 10),
        [yKey]: int(120, 900),
      };
    });
  }
  if (chartType === "funnel") {
    let cur = int(1500, 2200);
    return ["Start", "Step 2", "Step 3", "Step 4", "Complete"].map((n, i) => {
      if (i > 0) cur = Math.floor(cur * (0.55 + rand(0.3)));
      return { [xKey]: n, [yKey]: cur };
    });
  }
  const labels = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta"];
  return labels.map((l) => ({ [xKey]: l, [yKey]: int(20, 250) })).sort(
    (a, b) => (b[yKey] as number) - (a[yKey] as number),
  );
}

export const Route = createFileRoute("/api/custom-chart")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: ReqBody;
        try {
          body = (await request.json()) as ReqBody;
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }
        const prompt = (body.prompt ?? "").trim();
        if (!prompt) return Response.json({ error: "Missing prompt" }, { status: 400 });

        const seed = body.seed ?? Math.floor(Math.random() * 1e9);

        // Fast path: caller already has a spec, just re-run
        if (body.sql && body.chartType && body.xKey && body.yKey) {
          try {
            const { runSelect } = await import("@/lib/db.server");
            const { rows } = await runSelect(body.sql, [], 500);
            return Response.json({
              title: prompt,
              chartType: body.chartType,
              xKey: body.xKey,
              yKey: body.yKey,
              sql: body.sql,
              data: rows,
            } satisfies Spec);
          } catch {
            // fall through to mock refresh with the known shape
            return Response.json({
              title: prompt,
              chartType: body.chartType,
              xKey: body.xKey,
              yKey: body.yKey,
              sql: body.sql,
              data: mockDataFor(body.chartType, body.xKey, body.yKey, seed),
            } satisfies Spec);
          }
        }

        // First-time spec generation via Anthropic (best effort)
        const key = process.env.ANTHROPIC_API_KEY;
        let spec: Omit<Spec, "data"> | null = null;

        if (key) {
          try {
            const anthropic = new Anthropic({ apiKey: key });
            const resp = await anthropic.messages.create({
              model: MODEL,
              max_tokens: 800,
              system:
                SCHEMA_PROMPT +
                `\n\nYou are designing a NEW dashboard tile. Reply with ONLY a compact JSON object, no prose:\n{ "title": string, "chartType": "bar"|"line"|"funnel", "xKey": string, "yKey": string, "sql": string }\nThe SQL must be a single SELECT that returns rows with columns matching xKey and yKey. Aim for <= 50 rows.`,
              messages: [{ role: "user", content: prompt }],
            });
            const text = resp.content
              .filter((b): b is Anthropic.TextBlock => b.type === "text")
              .map((b) => b.text)
              .join("");
            const match = text.match(/\{[\s\S]*\}/);
            if (match) {
              const parsed = JSON.parse(match[0]) as Omit<Spec, "data">;
              spec = {
                title: String(parsed.title || prompt),
                chartType:
                  parsed.chartType === "line" || parsed.chartType === "funnel"
                    ? parsed.chartType
                    : "bar",
                xKey: String(parsed.xKey || "label"),
                yKey: String(parsed.yKey || "value"),
                sql: parsed.sql ? String(parsed.sql) : null,
              };
            }
          } catch {
            /* fall through */
          }
        }

        // Fallback spec if LLM unavailable
        if (!spec) {
          const lower = prompt.toLowerCase();
          const chartType: "bar" | "line" | "funnel" = lower.includes("funnel")
            ? "funnel"
            : lower.includes("over time") || lower.includes("daily") || lower.includes("trend")
              ? "line"
              : "bar";
          spec = {
            title: prompt,
            chartType,
            xKey: chartType === "line" ? "day" : "label",
            yKey: "value",
            sql: null,
          };
        }

        // Try SQL, else mock
        let data: Array<Record<string, unknown>> | null = null;
        if (spec.sql) {
          try {
            const { runSelect } = await import("@/lib/db.server");
            const res = await runSelect(spec.sql, [], 500);
            data = res.rows;
          } catch {
            data = null;
          }
        }
        if (!data || data.length === 0) {
          data = mockDataFor(spec.chartType, spec.xKey, spec.yKey, seed);
        }

        return Response.json({ ...spec, data } satisfies Spec);
      },
    },
  },
});
