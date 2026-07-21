import { createFileRoute } from "@tanstack/react-router";
import Anthropic from "@anthropic-ai/sdk";
import { SCHEMA_PROMPT } from "@/lib/schema-prompt";

type ClientMessage = { role: "user" | "assistant"; content: string };

type ChartSpec = {
  type: "bar" | "line" | "funnel";
  title?: string;
  xKey: string;
  yKey: string;
  data: Array<Record<string, unknown>>;
};

const MODEL = "claude-sonnet-4-5";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.ANTHROPIC_API_KEY;
        if (!key)
          return Response.json(
            { error: "ANTHROPIC_API_KEY not set" },
            { status: 500 },
          );

        let body: { messages?: ClientMessage[] };
        try {
          body = (await request.json()) as { messages?: ClientMessage[] };
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }
        const history = Array.isArray(body.messages) ? body.messages : [];
        if (history.length === 0)
          return Response.json({ error: "No messages" }, { status: 400 });

        const anthropic = new Anthropic({ apiKey: key });
        const { runSelect } = await import("@/lib/db.server");

        const tools: Anthropic.Tool[] = [
          {
            name: "run_sql",
            description:
              "Run a single read-only SELECT/WITH query against the events table. Reject non-SELECT statements. Use $1,$2,... placeholders and put values in `params`.",
            input_schema: {
              type: "object",
              properties: {
                sql: { type: "string", description: "A single SELECT/WITH statement." },
                params: {
                  type: "array",
                  items: {},
                  description: "Values to bind to $1,$2,... Optional.",
                },
              },
              required: ["sql"],
            },
          },
          {
            name: "render_chart",
            description:
              "Render a chart in the chat. Use after run_sql. Pass the row data directly (small arrays).",
            input_schema: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["bar", "line", "funnel"] },
                title: { type: "string" },
                xKey: { type: "string", description: "Field name for the x-axis / category." },
                yKey: { type: "string", description: "Field name for the numeric value." },
                data: {
                  type: "array",
                  items: { type: "object" },
                  description: "Array of row objects with xKey and yKey fields.",
                },
              },
              required: ["type", "xKey", "yKey", "data"],
            },
          },
        ];

        const messages: Anthropic.MessageParam[] = history.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const charts: ChartSpec[] = [];
        let finalText = "";
        let steps = 0;

        try {
          while (steps++ < 8) {
            const resp = await anthropic.messages.create({
              model: MODEL,
              max_tokens: 2048,
              system: SCHEMA_PROMPT,
              tools,
              messages,
            });

            messages.push({ role: "assistant", content: resp.content });

            if (resp.stop_reason !== "tool_use") {
              finalText = resp.content
                .filter((b): b is Anthropic.TextBlock => b.type === "text")
                .map((b) => b.text)
                .join("\n")
                .trim();
              break;
            }

            const toolResults: Anthropic.ToolResultBlockParam[] = [];
            for (const block of resp.content) {
              if (block.type !== "tool_use") continue;
              if (block.name === "run_sql") {
                const input = block.input as { sql?: string; params?: unknown[] };
                try {
                  const { rows, rowCount } = await runSelect(
                    String(input.sql ?? ""),
                    Array.isArray(input.params) ? input.params : [],
                  );
                  toolResults.push({
                    type: "tool_result",
                    tool_use_id: block.id,
                    content: JSON.stringify({
                      row_count: rowCount,
                      rows: rows.slice(0, 200),
                    }),
                  });
                } catch (e) {
                  toolResults.push({
                    type: "tool_result",
                    tool_use_id: block.id,
                    is_error: true,
                    content: e instanceof Error ? e.message : String(e),
                  });
                }
              } else if (block.name === "render_chart") {
                const spec = block.input as ChartSpec;
                charts.push(spec);
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: block.id,
                  content: "Chart rendered.",
                });
              } else {
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: block.id,
                  is_error: true,
                  content: `Unknown tool: ${block.name}`,
                });
              }
            }
            messages.push({ role: "user", content: toolResults });
          }
        } catch (e) {
          return Response.json(
            { error: e instanceof Error ? e.message : String(e) },
            { status: 500 },
          );
        }

        return Response.json({
          text: finalText || "(no response)",
          charts,
        });
      },
    },
  },
});
