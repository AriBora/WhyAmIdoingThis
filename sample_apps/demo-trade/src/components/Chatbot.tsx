import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";

type Msg = { role: "user" | "bot"; text: string };

const CANNED: { match: RegExp; reply: string }[] = [
  { match: /balance|cash|funds/i, reply: "Your available cash balance is shown on the Portfolio page. You can add more via Deposit." },
  { match: /(buy|sell|order|trade)/i, reply: "Open a stock detail page and use the Buy or Sell button. Orders go through a 4-step review including a risk disclosure." },
  { match: /(chart|history|historical|price)/i, reply: "On any stock detail page, use the time range selector (1D / 1W / 1M / 1Y / 5Y) above the chart to see historical prices." },
  { match: /(sector|breakdown|allocation|holdings)/i, reply: "Your Portfolio page shows breakdown donuts by account type, sector, and market cap — hover a slice for details." },
  { match: /(refresh|update|live)/i, reply: "Quotes don't auto-refresh in this build. Click Refresh quotes on the portfolio header when you want new prices." },
  { match: /(help|support)/i, reply: "Support is unfortunately… under construction. Try the /support link if you're feeling brave." },
];

function reply(input: string): string {
  for (const r of CANNED) if (r.match.test(input)) return r.reply;
  return "I'm a demo assistant — try asking about your balance, holdings, historical charts, or how to place an order.";
}

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "bot", text: "Hi, I'm Merlin. Ask me about your portfolio, charts, or how to trade." },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open]);

  const send = () => {
    const t = input.trim();
    if (!t) return;
    setMessages((m) => [...m, { role: "user", text: t }]);
    setInput("");
    track("chatbot_message", { length: t.length });
    setTimeout(() => {
      setMessages((m) => [...m, { role: "bot", text: reply(t) }]);
    }, 400);
  };

  return (
    <>
      <button
        data-track="chatbot_toggle"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90"
        aria-label="Open assistant"
      >
        {open ? "×" : "💬"}
      </button>
      {open && (
        <div className="fixed bottom-20 right-5 z-50 flex h-[420px] w-80 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-gain" />
              <span className="text-sm font-semibold">Merlin — Assistant</span>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Demo</span>
          </div>
          <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-lg px-3 py-2 ${
                  m.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex gap-2 border-t border-border p-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your portfolio…"
              className="flex-1 rounded-md border border-border bg-input px-3 py-2 text-sm outline-none"
            />
            <button
              type="submit"
              className="rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}