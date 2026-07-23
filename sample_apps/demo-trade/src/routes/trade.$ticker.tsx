import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Card, Shell, fmt } from "@/components/Shell";
import { submitOrder, useStore } from "@/lib/store";
import { clearFlow, flowStep, track, useScreen } from "@/lib/analytics";
import { useEffect, useState } from "react";

const search = z.object({
  side: z.enum(["buy", "sell"]).default("buy"),
  step: z.coerce.number().min(1).max(4).default(1),
});

export const Route = createFileRoute("/trade/$ticker")({
  head: ({ params }) => ({
    meta: [
      { title: `Trade ${params.ticker} — DemoTrade` },
      { name: "description", content: `Place a buy or sell order for ${params.ticker}.` },
    ],
  }),
  validateSearch: (s) => search.parse(s),
  component: Trade,
});

function Trade() {
  const { ticker } = Route.useParams();
  const { side, step } = Route.useSearch();
  const router = useRouter();
  const price = useStore((s) => s.prices[ticker]?.price ?? 0);
  const loggedIn = useStore((s) => s.loggedIn);
  const flowName = side === "buy" ? "buy_order" : "sell_order";

  useScreen(`${flowName}_step_${step}`);

  useEffect(() => {
    if (!loggedIn) router.navigate({ to: "/" });
  }, [loggedIn, router]);

  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [qty, setQty] = useState(10);
  const [limitPrice, setLimitPrice] = useState<string>("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectivePrice = orderType === "limit" && limitPrice ? Number(limitPrice) : price;
  const total = effectivePrice * qty;
  const fees = 0.99;

  useEffect(() => {
    flowStep(flowName, step, `step_${step}`);
  }, [flowName, step]);

  const goto = (n: number) =>
    router.navigate({ to: "/trade/$ticker", params: { ticker }, search: { side, step: n } });

  return (
    <Shell>
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold capitalize">
            {side} {ticker}
          </h1>
          <button
            data-track="trade_cancel"
            onClick={() => {
              router.navigate({ to: "/stock/$ticker", params: { ticker } });
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>

        <Stepper step={step} />

        <Card className="mt-6">
          {step === 1 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold">Order details</h2>
              <label className="mb-4 block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Order type</span>
                <div className="flex gap-2">
                  {(["market", "limit"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setOrderType(t)}
                      className={`flex-1 rounded-md border px-3 py-2 text-sm capitalize ${
                        orderType === t
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </label>
              <label className="mb-4 block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Quantity</span>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  className="mono w-full rounded-md border border-border bg-input px-3 py-2 outline-none"
                />
              </label>
              {orderType === "limit" && (
                <label className="mb-4 block">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">Price</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    className="mono w-full rounded-md border border-border bg-input px-3 py-2 outline-none"
                  />
                </label>
              )}
              <div className="mono mt-4 rounded-md bg-muted/40 p-3 text-sm">
                Est. total <span className="float-right">${fmt(total)}</span>
              </div>
              {error && <div className="mt-3 text-sm text-loss">{error}</div>}
              <div className="mt-6 flex justify-end">
                <button
                  data-track="trade_step1_next"
                  onClick={() => {
                    if (orderType === "limit" && !limitPrice) {
                      setError("Enter a price to continue.");
                      track("form_error", {
                        screen_name: `${flowName}_step_1`,
                        field_name: "limit_price",
                      });
                      return;
                    }
                    setError(null);
                    goto(2);
                  }}
                  className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="mb-2 text-lg font-semibold">Risk disclosure</h2>
              <p className="mb-4 text-xs text-muted-foreground">Please read before continuing.</p>
              <div className="mono mb-4 max-h-56 overflow-y-auto rounded-md border border-border bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
                Trading securities involves significant risk of loss and is not suitable for every
                investor. The valuation of securities and the income derived from them may
                fluctuate. Past performance is not a reliable indicator of future performance.
                DemoTrade Securities Ltd. is a mock, hackathon-only entity and does not execute real
                orders. By continuing you acknowledge that you have read the accompanying risk
                disclosure statement, understand that leveraged instruments may result in losses
                exceeding your initial deposit, and consent to receive electronic delivery of all
                account documents including trade confirmations, monthly statements, prospectuses,
                proxy materials and tax documents. Orders routed via smart order routing may be
                executed on off-exchange venues where price improvement is not guaranteed.
              </div>
              <label className="mb-2 flex items-start gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5"
                />
                <span>I have read and accept the risk disclosure.</span>
              </label>
              {error && <div className="mt-2 text-sm text-loss">{error}</div>}
              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => goto(1)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  ← Back
                </button>
                <button
                  data-track="trade_step2_next"
                  onClick={() => {
                    if (!agreed) {
                      setError("You must accept the risk disclosure.");
                      track("form_error", {
                        screen_name: `${flowName}_step_2`,
                        field_name: "risk_disclosure",
                      });
                      return;
                    }
                    setError(null);
                    goto(3);
                  }}
                  className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold">Review order</h2>
              <dl className="space-y-2 text-sm">
                <Row k="Side" v={side.toUpperCase()} />
                <Row k="Symbol" v={ticker} />
                <Row k="Type" v={orderType} />
                <Row k="Quantity" v={String(qty)} />
                <Row k="Price" v={`$${fmt(effectivePrice)}`} />
                <Row k="Est. fees" v={`$${fmt(fees)}`} />
                <Row k="Estimated total" v={`$${fmt(total + fees)}`} bold />
              </dl>
              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => goto(2)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  ← Back
                </button>
                <button
                  data-track="trade_submit"
                  onClick={() => {
                    submitOrder({ ticker, side, qty, price: effectivePrice });
                    goto(4);
                  }}
                  className={`rounded-md px-5 py-2 text-sm font-semibold text-background ${
                    side === "buy" ? "bg-gain" : "bg-loss"
                  }`}
                >
                  Submit {side} order
                </button>
              </div>
            </div>
          )}

          {step === 4 && <Success flowName={flowName} ticker={ticker} qty={qty} />}
        </Card>
      </div>
    </Shell>
  );
}

function Success({ flowName, ticker, qty }: { flowName: string; ticker: string; qty: number }) {
  useEffect(() => {
    clearFlow();
    track("flow_completed", { flow_name: flowName });
  }, [flowName]);
  return (
    <div className="py-6 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gain/20 text-gain">
        ✓
      </div>
      <h2 className="text-xl font-semibold">Order submitted</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Your order for {qty} shares of {ticker} has been received.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link
          to="/portfolio"
          className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
        >
          Back to portfolio
        </Link>
        <Link
          to="/stock/$ticker"
          params={{ ticker }}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          View {ticker}
        </Link>
      </div>
    </div>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between border-b border-border pb-2 ${bold ? "font-semibold" : ""}`}>
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="mono">{v}</dd>
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  const labels = ["Details", "Disclosure", "Review", "Done"];
  return (
    <div className="flex items-center gap-2">
      {labels.map((l, i) => {
        const n = i + 1;
        const active = n === step;
        const done = n < step;
        return (
          <div key={l} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                done
                  ? "bg-primary text-primary-foreground"
                  : active
                    ? "border border-primary text-primary"
                    : "border border-border text-muted-foreground"
              }`}
            >
              {done ? "✓" : n}
            </div>
            <span className={`text-xs ${active ? "text-foreground" : "text-muted-foreground"}`}>
              {l}
            </span>
            {i < labels.length - 1 && <div className="h-px flex-1 bg-border" />}
          </div>
        );
      })}
    </div>
  );
}