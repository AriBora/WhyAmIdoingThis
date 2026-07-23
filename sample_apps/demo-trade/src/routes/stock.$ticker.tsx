import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Card, Shell, fmt } from "@/components/Shell";
import { getTickerName, useStore } from "@/lib/store";
import { track, useScreen } from "@/lib/analytics";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/stock/$ticker")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.ticker} — DemoTrade` },
      { name: "description", content: `Live quote, chart, and trade actions for ${params.ticker}.` },
    ],
  }),
  component: StockDetail,
});

function StockDetail() {
  const { ticker } = Route.useParams();
  useScreen(`stock_detail_${ticker}`);
  const router = useRouter();
  const loggedIn = useStore((s) => s.loggedIn);
  const price = useStore((s) => s.prices[ticker]?.price ?? 0);
  const change = useStore((s) => s.prices[ticker]?.change ?? 0);
  const position = useStore((s) => s.positions.find((p) => p.ticker === ticker));

  useEffect(() => {
    if (!loggedIn) router.navigate({ to: "/" });
  }, [loggedIn, router]);

  const RANGES = ["1D", "1W", "1M", "1Y", "5Y"] as const;
  type Range = (typeof RANGES)[number];
  const [range, setRange] = useState<Range>("1M");
  const { points, first, last } = useMemo(
    () => generateChart(ticker, price || 100, range),
    [ticker, price, range],
  );
  const rangeChange = last - first;
  const rangePct = (rangeChange / first) * 100;

  return (
    <Shell>
      <Link to="/portfolio" className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground">
        ← Back to portfolio
      </Link>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                {getTickerName(ticker)}
              </div>
              <h1 className="text-3xl font-semibold">{ticker}</h1>
            </div>
            <div className="text-right">
              <div className="mono text-3xl font-semibold">${fmt(price)}</div>
              <div className={`mono text-sm ${change >= 0 ? "text-gain" : "text-loss"}`}>
                {change >= 0 ? "▲" : "▼"} {change.toFixed(2)}
              </div>
            </div>
          </div>
          <div className="mb-2 flex items-center justify-between">
            <div className={`mono text-sm ${rangeChange >= 0 ? "text-gain" : "text-loss"}`}>
              {range} · {rangeChange >= 0 ? "+" : ""}${fmt(rangeChange)} ({rangePct.toFixed(2)}%)
            </div>
            <div className="flex gap-1">
              {RANGES.map((r) => (
                <button
                  key={r}
                  data-track={`chart_range_${r}`}
                  onClick={() => {
                    setRange(r);
                    track("button_click", { screen_name: `stock_detail_${ticker}`, button_label: `Range ${r}` });
                  }}
                  className={`rounded px-2 py-1 text-xs ${
                    range === r
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <Sparkline points={points} up={rangeChange >= 0} />
          <div className="mt-4 flex gap-3">
            <Link
              to="/trade/$ticker"
              params={{ ticker }}
              search={{ side: "buy" as const, step: 1 }}
              data-track={`buy_${ticker}`}
              className="flex-1 rounded-md bg-gain py-2.5 text-center text-sm font-semibold text-background hover:opacity-90"
            >
              Buy {ticker}
            </Link>
            <Link
              to="/trade/$ticker"
              params={{ ticker }}
              search={{ side: "sell" as const, step: 1 }}
              data-track={`sell_${ticker}`}
              className="flex-1 rounded-md bg-loss py-2.5 text-center text-sm font-semibold text-background hover:opacity-90"
            >
              Sell {ticker}
            </Link>
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Key stats</h2>
          <dl className="space-y-3 text-sm">
            <Stat k="Open" v={`$${fmt(price * 0.994)}`} />
            <Stat k="Day high" v={`$${fmt(price * 1.012)}`} />
            <Stat k="Day low" v={`$${fmt(price * 0.988)}`} />
            <Stat k="52w high" v={`$${fmt(price * 1.18)}`} />
            <Stat k="52w low" v={`$${fmt(price * 0.72)}`} />
            <Stat k="P/E" v={(15 + ticker.length * 3).toFixed(2)} />
            <Stat k="Mkt cap" v={`$${(price * 1.4).toFixed(1)}B`} />
          </dl>
          {position && (
            <div className="mt-6 rounded-md border border-border bg-muted/40 p-3 text-sm">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Your position
              </div>
              <div className="mono mt-1">
                {position.shares} shares @ ${fmt(position.avgCost)}
              </div>
            </div>
          )}
        </Card>
      </div>
    </Shell>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-border pb-1">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="mono">{v}</dd>
    </div>
  );
}

function generateChart(
  seed: string,
  price: number,
  range: "1D" | "1W" | "1M" | "1Y" | "5Y",
): { points: number[]; first: number; last: number } {
  const cfg = {
    "1D": { n: 78, vol: 0.003, drift: 0.98 },
    "1W": { n: 60, vol: 0.006, drift: 0.95 },
    "1M": { n: 90, vol: 0.012, drift: 0.88 },
    "1Y": { n: 120, vol: 0.02, drift: 0.7 },
    "5Y": { n: 180, vol: 0.03, drift: 0.4 },
  }[range];
  let s = 0;
  for (const c of seed + range) s = (s * 31 + c.charCodeAt(0)) >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff - 0.5;
  };
  const arr: number[] = [];
  let v = price * cfg.drift;
  for (let i = 0; i < cfg.n; i++) {
    v += rand() * price * cfg.vol;
    arr.push(v);
  }
  const scale = price / arr[arr.length - 1];
  const scaled = arr.map((x) => x * scale);
  return { points: scaled, first: scaled[0], last: scaled[scaled.length - 1] };
}

function Sparkline({ points, up }: { points: number[]; up: boolean }) {
  const w = 700;
  const h = 200;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const d = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p - min) / (max - min || 1)) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const color = up ? "var(--gain)" : "var(--loss)";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      <defs>
        <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill="url(#g)" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}