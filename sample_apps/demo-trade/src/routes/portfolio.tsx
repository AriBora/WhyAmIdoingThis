import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Card, Shell, fmt } from "@/components/Shell";
import {
  addToWatchlist,
  refreshPrices,
  removeFromWatchlist,
  tickerMeta,
  useStore,
} from "@/lib/store";
import { track, useScreen } from "@/lib/analytics";
import { useEffect, useState } from "react";
import { Donut, type DonutSlice } from "@/components/Donut";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfolio — DemoTrade" },
      { name: "description", content: "Your positions, cash balance, and watchlist." },
    ],
  }),
  component: Portfolio,
});

function Portfolio() {
  useScreen("portfolio");
  const router = useRouter();
  const loggedIn = useStore((s) => s.loggedIn);
  const balance = useStore((s) => s.balance);
  const positions = useStore((s) => s.positions);
  const watchlist = useStore((s) => s.watchlist);
  const prices = useStore((s) => s.prices);

  useEffect(() => {
    if (!loggedIn) router.navigate({ to: "/" });
  }, [loggedIn, router]);

  const equity = positions.reduce((a, p) => a + p.shares * p.price, 0);
  const dayChange = positions.reduce(
    (a, p) => a + (prices[p.ticker]?.change ?? 0) * p.shares,
    0,
  );

  const PALETTE = ["#22c55e", "#3b82f6", "#f59e0b", "#a855f7", "#ef4444", "#14b8a6"];
  const bySector = new Map<string, number>();
  const byCap = new Map<string, number>();
  const byStock: DonutSlice[] = [];
  positions.forEach((p, i) => {
    const value = p.shares * p.price;
    const meta = tickerMeta[p.ticker] ?? { sector: "Other", cap: "Large" as const };
    bySector.set(meta.sector, (bySector.get(meta.sector) ?? 0) + value);
    byCap.set(meta.cap, (byCap.get(meta.cap) ?? 0) + value);
    byStock.push({ label: p.ticker, value, color: PALETTE[i % PALETTE.length] });
  });
  const sectorSlices: DonutSlice[] = [...bySector.entries()].map(([label, value], i) => ({
    label,
    value,
    color: PALETTE[i % PALETTE.length],
  }));
  const capSlices: DonutSlice[] = [...byCap.entries()].map(([label, value], i) => ({
    label: `${label} cap`,
    value,
    color: PALETTE[i % PALETTE.length],
  }));
  const accountSlices: DonutSlice[] = [
    { label: "Equity", value: equity, color: PALETTE[1] },
    { label: "Cash", value: balance, color: PALETTE[2] },
  ];

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Holdings</h1>
        <button
          data-track="portfolio_refresh"
          onClick={() => {
            refreshPrices();
            track("prices_refreshed", {});
          }}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          ↻ Refresh quotes
        </button>
      </div>
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <Card>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Total value</div>
          <div className="mono mt-2 text-3xl font-semibold">${fmt(balance + equity)}</div>
          <div className={`mono mt-1 text-sm ${dayChange >= 0 ? "text-gain" : "text-loss"}`}>
            {dayChange >= 0 ? "▲" : "▼"} ${fmt(Math.abs(dayChange))} today
          </div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Cash</div>
          <div className="mono mt-2 text-3xl font-semibold">${fmt(balance)}</div>
          <Link
            to="/deposit"
            data-track="portfolio_deposit_cta"
            className="mt-3 inline-block text-sm text-primary hover:underline"
          >
            Deposit funds →
          </Link>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Positions</div>
          <div className="mono mt-2 text-3xl font-semibold">${fmt(equity)}</div>
          <div className="mt-1 text-sm text-muted-foreground">{positions.length} holdings</div>
        </Card>
      </div>

      <Card className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">Breakdown</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <Donut title="Account" slices={accountSlices} />
          <Donut title="Sectors" slices={sectorSlices} />
          <Donut title="Stocks" slices={byStock} />
        </div>
        <div className="mt-4 text-xs text-muted-foreground">
          Hover a slice to highlight. By market cap:{" "}
          {capSlices
            .map((s) => `${s.label} ${((s.value / (equity || 1)) * 100).toFixed(1)}%`)
            .join(" · ")}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Holdings</h2>
          </div>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Ticker</th>
                  <th className="px-3 py-2">Shares</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Value</th>
                  <th className="px-3 py-2">P/L</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => {
                  const value = p.shares * p.price;
                  const pl = (p.price - p.avgCost) * p.shares;
                  const plPct = ((p.price - p.avgCost) / p.avgCost) * 100;
                  return (
                    <tr
                      key={p.ticker}
                      className="cursor-pointer border-t border-border hover:bg-accent"
                      onClick={() => {
                        track("offering_click", {
                          screen_name: "portfolio",
                          item_type: "stock",
                          item_id: p.ticker,
                          item_label: p.name,
                        });
                        router.navigate({ to: "/stock/$ticker", params: { ticker: p.ticker } });
                      }}
                    >
                      <td className="px-3 py-3">
                        <div className="font-semibold">{p.ticker}</div>
                        <div className="text-xs text-muted-foreground">{p.name}</div>
                      </td>
                      <td className="mono px-3 py-3">{p.shares}</td>
                      <td className="mono px-3 py-3">${fmt(p.price)}</td>
                      <td className="mono px-3 py-3">${fmt(value)}</td>
                      <td className={`mono px-3 py-3 ${pl >= 0 ? "text-gain" : "text-loss"}`}>
                        {pl >= 0 ? "+" : ""}${fmt(pl)} <span className="text-xs">({plPct.toFixed(2)}%)</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Watchlist</h2>
            <AddWatch />
          </div>
          <ul className="space-y-2">
            {watchlist.map((t) => {
              const p = prices[t];
              const change = p?.change ?? 0;
              return (
                <li
                  key={t}
                  className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2"
                >
                  <Link
                    to="/stock/$ticker"
                    params={{ ticker: t }}
                    className="flex-1 font-semibold hover:text-primary"
                    onClick={() => {
                      track("offering_click", {
                        screen_name: "portfolio",
                        item_type: "stock",
                        item_id: t,
                        item_label: t,
                      });
                    }}
                  >
                    {t}
                  </Link>
                  <div className="mono text-sm">${fmt(p?.price ?? 0)}</div>
                  <div
                    className={`mono ml-3 w-16 text-right text-xs ${change >= 0 ? "text-gain" : "text-loss"}`}
                  >
                    {change >= 0 ? "+" : ""}
                    {change.toFixed(2)}
                  </div>
                  <button
                    onClick={() => {
                      removeFromWatchlist(t);
                      track("watchlist_remove", {
                        screen_name: "portfolio",
                        item_type: "stock",
                        item_id: t,
                        item_label: t,
                      });
                    }}
                    className="ml-2 text-muted-foreground hover:text-loss"
                    aria-label={`Remove ${t}`}
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </Shell>
  );
}

function AddWatch() {
  const [val, setVal] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const t = val.trim().toUpperCase();
        if (!t) return;
        addToWatchlist(t);
        track("watchlist_add", {
          screen_name: "portfolio",
          item_type: "stock",
          item_id: t,
          item_label: t,
        });
        setVal("");
      }}
      className="flex gap-1"
    >
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="Add"
        className="w-20 rounded border border-border bg-input px-2 py-1 text-xs outline-none"
      />
      <button
        type="submit"
        className="rounded bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground"
      >
        +
      </button>
    </form>
  );
}