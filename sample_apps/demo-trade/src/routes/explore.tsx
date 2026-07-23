import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Card, Shell, fmt } from "@/components/Shell";
import {
  addToWatchlist,
  allTickers,
  getTickerName,
  refreshPrices,
  removeFromWatchlist,
  tickerMeta,
  useStore,
} from "@/lib/store";
import { track, useScreen } from "@/lib/analytics";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore stocks — DemoTrade" },
      { name: "description", content: "Search stocks, view historical prices, and add to your watchlist." },
      { property: "og:title", content: "Explore stocks — DemoTrade" },
      { property: "og:description", content: "Search the market and build your watchlist." },
    ],
  }),
  component: Explore,
});

function Explore() {
  useScreen("explore");
  const router = useRouter();
  const loggedIn = useStore((s) => s.loggedIn);
  const prices = useStore((s) => s.prices);
  const watchlist = useStore((s) => s.watchlist);
  const [q, setQ] = useState("");
  const [sector, setSector] = useState<string>("All");

  useEffect(() => {
    if (!loggedIn) router.navigate({ to: "/" });
  }, [loggedIn, router]);

  const sectors = useMemo(() => {
    const s = new Set<string>(["All"]);
    allTickers().forEach((t) => s.add(tickerMeta[t]?.sector ?? "Other"));
    return [...s];
  }, []);

  const rows = useMemo(() => {
    const needle = q.trim().toUpperCase();
    return allTickers()
      .filter((t) => {
        const meta = tickerMeta[t];
        if (sector !== "All" && (meta?.sector ?? "Other") !== sector) return false;
        if (!needle) return true;
        return t.includes(needle) || getTickerName(t).toUpperCase().includes(needle);
      })
      .map((t) => ({
        ticker: t,
        name: getTickerName(t),
        sector: tickerMeta[t]?.sector ?? "Other",
        cap: tickerMeta[t]?.cap ?? "Large",
        price: prices[t]?.price ?? 0,
        change: prices[t]?.change ?? 0,
      }));
  }, [q, sector, prices]);

  return (
    <Shell>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Explore</h1>
          <p className="text-sm text-muted-foreground">
            Search the market, peek at history, and build a watchlist.
          </p>
        </div>
        <button
          data-track="explore_refresh"
          onClick={() => {
            refreshPrices();
            track("prices_refreshed", { from: "explore" });
          }}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          ↻ Refresh quotes
        </button>
      </div>

      <Card className="mb-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              if (e.target.value.length > 1)
                track("explore_search", { query: e.target.value });
            }}
            placeholder="Search ticker or company (e.g. AAPL, Tesla)"
            className="flex-1 rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <select
            value={sector}
            onChange={(e) => {
              setSector(e.target.value);
              track("explore_filter_sector", { sector: e.target.value });
            }}
            className="rounded-md border border-border bg-input px-3 py-2 text-sm outline-none"
          >
            {sectors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Ticker</th>
                <th className="px-3 py-2">Sector</th>
                <th className="px-3 py-2">Trend</th>
                <th className="px-3 py-2">Price</th>
                <th className="px-3 py-2">Change</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const watched = watchlist.includes(r.ticker);
                return (
                  <tr key={r.ticker} className="border-t border-border hover:bg-accent/40">
                    <td className="px-3 py-3">
                      <Link
                        to="/stock/$ticker"
                        params={{ ticker: r.ticker }}
                        className="font-semibold hover:text-primary"
                        data-track="explore_open_ticker"
                        onClick={() => {
                          track("offering_click", {
                            screen_name: "explore",
                            item_type: "stock",
                            item_id: r.ticker,
                            item_label: r.name,
                          });
                        }}
                      >
                        {r.ticker}
                      </Link>
                      <div className="text-xs text-muted-foreground">{r.name}</div>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {r.sector} · {r.cap}
                    </td>
                    <td className="px-3 py-3">
                      <MiniSpark seed={r.ticker} up={r.change >= 0} />
                    </td>
                    <td className="mono px-3 py-3">${fmt(r.price)}</td>
                    <td
                      className={`mono px-3 py-3 text-xs ${r.change >= 0 ? "text-gain" : "text-loss"}`}
                    >
                      {r.change >= 0 ? "+" : ""}
                      {r.change.toFixed(2)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          data-track="explore_watchlist_toggle"
                          onClick={() => {
                            if (watched) {
                              removeFromWatchlist(r.ticker);
                              track("watchlist_remove", { screen_name: "explore", item_type: "stock", item_id: r.ticker, item_label: r.name });
                            } else {
                              addToWatchlist(r.ticker);
                              track("watchlist_add", { screen_name: "explore", item_type: "stock", item_id: r.ticker, item_label: r.name });
                            }
                          }}
                          className={`rounded border px-2 py-1 text-xs ${
                            watched
                              ? "border-primary text-primary"
                              : "border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {watched ? "★ Watching" : "☆ Watch"}
                        </button>
                        <Link
                          to="/trade/$ticker"
                          params={{ ticker: r.ticker }}
                          search={{ side: "buy" as const, step: 1 }}
                          data-track={`explore_buy_${r.ticker}`}
                          className="rounded bg-gain px-2 py-1 text-xs font-semibold text-background hover:opacity-90"
                        >
                          Buy
                        </Link>
                        <Link
                          to="/trade/$ticker"
                          params={{ ticker: r.ticker }}
                          search={{ side: "sell" as const, step: 1 }}
                          data-track={`explore_sell_${r.ticker}`}
                          className="rounded bg-loss px-2 py-1 text-xs font-semibold text-background hover:opacity-90"
                        >
                          Sell
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    No matches. Try a different search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          Tap a ticker to view historical price ranges (1D / 1W / 1M / 1Y / 5Y).
        </div>
      </Card>
    </Shell>
  );
}

function MiniSpark({ seed, up }: { seed: string; up: boolean }) {
  const points = useMemo(() => {
    let s = 0;
    for (const c of seed) s = (s * 31 + c.charCodeAt(0)) >>> 0;
    const rand = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xffffffff - 0.5;
    };
    const arr: number[] = [];
    let v = 50;
    for (let i = 0; i < 24; i++) {
      v += rand() * 8;
      arr.push(v);
    }
    return arr;
  }, [seed]);
  const w = 90;
  const h = 28;
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
    <svg viewBox={`0 0 ${w} ${h}`} className="h-6 w-24">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}