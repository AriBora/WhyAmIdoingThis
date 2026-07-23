import { useSyncExternalStore } from "react";

export type Position = {
  ticker: string;
  name: string;
  shares: number;
  avgCost: number;
  price: number;
};

export type State = {
  loggedIn: boolean;
  email: string;
  balance: number;
  positions: Position[];
  watchlist: string[];
  prices: Record<string, { price: number; change: number }>;
  orders: { ticker: string; side: "buy" | "sell"; qty: number; price: number; when: number }[];
};

const initialPositions: Position[] = [
  { ticker: "AAPL", name: "Apple Inc.", shares: 45, avgCost: 168.2, price: 214.55 },
  { ticker: "MSFT", name: "Microsoft Corp.", shares: 22, avgCost: 402.1, price: 438.9 },
  { ticker: "NVDA", name: "NVIDIA Corp.", shares: 30, avgCost: 512.4, price: 892.15 },
  { ticker: "TSLA", name: "Tesla, Inc.", shares: 18, avgCost: 245.3, price: 218.75 },
  { ticker: "AMZN", name: "Amazon.com Inc.", shares: 12, avgCost: 178.6, price: 201.4 },
  { ticker: "SPY", name: "SPDR S&P 500 ETF", shares: 40, avgCost: 498.2, price: 552.31 },
];

const initialWatch = ["META", "GOOGL", "AMD", "COIN", "NFLX"];

const baseMeta: Record<string, { name: string; price: number }> = {
  AAPL: { name: "Apple Inc.", price: 214.55 },
  MSFT: { name: "Microsoft Corp.", price: 438.9 },
  NVDA: { name: "NVIDIA Corp.", price: 892.15 },
  TSLA: { name: "Tesla, Inc.", price: 218.75 },
  AMZN: { name: "Amazon.com Inc.", price: 201.4 },
  SPY: { name: "SPDR S&P 500 ETF", price: 552.31 },
  META: { name: "Meta Platforms Inc.", price: 512.8 },
  GOOGL: { name: "Alphabet Inc.", price: 178.9 },
  AMD: { name: "Advanced Micro Devices", price: 162.4 },
  COIN: { name: "Coinbase Global", price: 234.7 },
  NFLX: { name: "Netflix Inc.", price: 692.15 },
};

export function getTickerName(t: string): string {
  return baseMeta[t]?.name ?? t;
}

const listeners = new Set<() => void>();

let state: State = {
  loggedIn: false,
  email: "",
  balance: 24_512.87,
  positions: initialPositions,
  watchlist: initialWatch,
  prices: Object.fromEntries(
    Object.entries(baseMeta).map(([k, v]) => [k, { price: v.price, change: 0 }]),
  ),
  orders: [],
};

function emit() {
  listeners.forEach((l) => l());
}

export function getState() {
  return state;
}

export function setState(partial: Partial<State> | ((s: State) => Partial<State>)) {
  const next = typeof partial === "function" ? partial(state) : partial;
  state = { ...state, ...next };
  emit();
}

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => selector(state),
    () => selector(state),
  );
}

// Manual refresh — values stay stable until the user asks for a new quote.
export function refreshPrices() {
  const next = { ...state.prices };
  for (const t of Object.keys(next)) {
    const p = next[t].price;
    const drift = (Math.random() - 0.5) * p * 0.02;
    const np = Math.max(0.01, p + drift);
    next[t] = { price: np, change: np - baseMeta[t].price };
  }
  const positions = state.positions.map((pos) => ({
    ...pos,
    price: next[pos.ticker]?.price ?? pos.price,
  }));
  setState({ prices: next, positions });
}

// Sector + market-cap classification for portfolio breakdown charts.
export const tickerMeta: Record<string, { sector: string; cap: "Large" | "Mid" | "Small" }> = {
  AAPL: { sector: "Technology", cap: "Large" },
  MSFT: { sector: "Technology", cap: "Large" },
  NVDA: { sector: "Technology", cap: "Large" },
  TSLA: { sector: "Consumer", cap: "Large" },
  AMZN: { sector: "Consumer", cap: "Large" },
  SPY: { sector: "Index / ETF", cap: "Large" },
  META: { sector: "Technology", cap: "Large" },
  GOOGL: { sector: "Technology", cap: "Large" },
  AMD: { sector: "Technology", cap: "Mid" },
  COIN: { sector: "Financials", cap: "Mid" },
  NFLX: { sector: "Consumer", cap: "Large" },
};

export function login(email: string) {
  setState({ loggedIn: true, email });
}

export function logout() {
  setState({ loggedIn: false, email: "" });
}

export function addToWatchlist(ticker: string) {
  if (state.watchlist.includes(ticker)) return;
  setState({ watchlist: [...state.watchlist, ticker] });
}

export function removeFromWatchlist(ticker: string) {
  setState({ watchlist: state.watchlist.filter((t) => t !== ticker) });
}

export function submitOrder(o: {
  ticker: string;
  side: "buy" | "sell";
  qty: number;
  price: number;
}) {
  setState((s) => {
    const total = o.qty * o.price;
    const balance = o.side === "buy" ? s.balance - total : s.balance + total;
    const existing = s.positions.find((p) => p.ticker === o.ticker);
    let positions = s.positions;
    if (o.side === "buy") {
      if (existing) {
        positions = s.positions.map((p) =>
          p.ticker === o.ticker
            ? {
                ...p,
                shares: p.shares + o.qty,
                avgCost: (p.avgCost * p.shares + o.price * o.qty) / (p.shares + o.qty),
              }
            : p,
        );
      } else {
        positions = [
          ...s.positions,
          {
            ticker: o.ticker,
            name: getTickerName(o.ticker),
            shares: o.qty,
            avgCost: o.price,
            price: o.price,
          },
        ];
      }
    } else if (existing) {
      positions = s.positions
        .map((p) => (p.ticker === o.ticker ? { ...p, shares: p.shares - o.qty } : p))
        .filter((p) => p.shares > 0);
    }
    return {
      balance,
      positions,
      orders: [...s.orders, { ...o, when: Date.now() }],
    };
  });
}

export function deposit(amount: number) {
  setState((s) => ({ balance: s.balance + amount }));
}

export const allTickers = () => Object.keys(baseMeta);