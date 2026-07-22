import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Sparkles, User } from "lucide-react";
import { ChartRenderer } from "./ChartRenderer";
import { api } from "@/lib/api";

type ChartSpec = {
  type: "bar" | "line" | "funnel";
  title?: string;
  xKey: string;
  yKey: string;
  data: Array<Record<string, unknown>>;
};
type Msg = {
  role: "user" | "assistant";
  content: string;
  charts?: ChartSpec[];
  ts: number;
};

const SUGGESTIONS = [
  "Where are users dropping off in the loan flow?",
  "What's the most common form error?",
  "Sessions today vs last week?",
  "Summarise the latest feedback",
];

export function ChatPanel({ appId }: { appId: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [appId]);

  // Reset conversation when the application changes.
  useEffect(() => {
    setMessages([]);
  }, [appId]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: q, ts: Date.now() }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const data = await api.chat(
        appId,
        next.map((m) => ({ role: m.role, content: m.content })),
      );
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.text, charts: data.charts, ts: Date.now() },
      ]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `⚠️ ${e instanceof Error ? e.message : String(e)}`,
          ts: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  return (
    <div className="flex flex-col h-full bg-surface border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-sm">Ask the analyst</div>
          <div className="text-[11px] text-muted-foreground font-mono truncate">
            read-only SQL · schema-aware
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Ask anything about events or feedback for this app. Try:
            </p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-sm px-3 py-2 rounded-lg border border-border bg-surface-2 hover:border-primary/50 hover:bg-primary/5 transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <MessageBubble key={i} msg={m} />
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="w-3 h-3 animate-pulse" />
            </div>
            <span className="animate-pulse">Thinking…</span>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="border-t border-border p-3 bg-surface-2"
      >
        <div className="flex items-end gap-2 bg-surface border border-border rounded-xl px-3 py-2 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20 transition">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Ask a question…"
            className="flex-1 bg-transparent resize-none outline-none text-sm max-h-32 py-1"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Msg }) {
  const time = new Date(msg.ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%]">
          <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2 text-sm whitespace-pre-wrap">
            {msg.content}
          </div>
          <div className="text-[10px] text-muted-foreground font-mono mt-1 text-right flex items-center gap-1 justify-end">
            <User className="w-3 h-3" /> {time}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <div className="w-7 h-7 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center mt-0.5">
        <Sparkles className="w-3.5 h-3.5" />
      </div>
      <div className="max-w-[85%] flex-1 min-w-0">
        <div className="text-sm text-foreground prose-sm">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              code: ({ children }) => (
                <code className="bg-surface-2 px-1 py-0.5 rounded text-xs">
                  {children}
                </code>
              ),
              ul: ({ children }) => <ul className="list-disc pl-5 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1">{children}</ol>,
            }}
          >
            {msg.content}
          </ReactMarkdown>
        </div>
        {msg.charts?.map((c, i) => (
          <div
            key={i}
            className="mt-3 border border-border rounded-xl bg-surface-2 p-3"
          >
            {c.title && (
              <div className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                {c.title}
              </div>
            )}
            <ChartRenderer type={c.type} xKey={c.xKey} yKey={c.yKey} data={c.data} height={220} />
          </div>
        ))}
        <div className="text-[10px] text-muted-foreground font-mono mt-1">{time}</div>
      </div>
    </div>
  );
}
