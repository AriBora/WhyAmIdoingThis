import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { z } from "zod";
import { Card, Shell, fmt } from "@/components/Shell";
import { deposit, useStore } from "@/lib/store";
import { clearFlow, flowStep, track, useScreen } from "@/lib/analytics";
import { useEffect, useState } from "react";

const search = z.object({ step: z.coerce.number().min(1).max(3).default(1) });

export const Route = createFileRoute("/deposit")({
  head: () => ({
    meta: [
      { title: "Deposit funds — DemoTrade" },
      { name: "description", content: "Move cash into your DemoTrade account." },
    ],
  }),
  validateSearch: (s) => search.parse(s),
  component: Deposit,
});

const BANKS = [
  { id: "chase-1234", name: "Chase •••• 1234" },
  { id: "boa-9821", name: "Bank of America •••• 9821" },
  { id: "citi-5502", name: "Citi •••• 5502" },
];

function Deposit() {
  const { step } = Route.useSearch();
  const router = useRouter();
  const loggedIn = useStore((s) => s.loggedIn);
  useScreen(`deposit_step_${step}`);

  useEffect(() => {
    if (!loggedIn) router.navigate({ to: "/" });
  }, [loggedIn, router]);

  const [amount, setAmount] = useState(500);
  const [bank, setBank] = useState(BANKS[0].id);

  useEffect(() => {
    flowStep("deposit", step, `step_${step}`);
  }, [step]);

  const goto = (n: number) => router.navigate({ to: "/deposit", search: { step: n } });

  return (
    <Shell>
      <div className="mx-auto max-w-lg">
        <h1 className="mb-6 text-2xl font-semibold">Deposit funds</h1>
        <Card>
          {step === 1 && (
            <div>
              <label className="mb-4 block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Amount (USD)</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="mono w-full rounded-md border border-border bg-input px-3 py-2 text-lg outline-none"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {[100, 500, 1000, 5000].map((v) => (
                  <button
                    key={v}
                    onClick={() => setAmount(v)}
                    className="rounded-md border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-accent"
                  >
                    ${v}
                  </button>
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  data-track="deposit_step1_next"
                  onClick={() => {
                    if (!amount || amount <= 0) {
                      track("form_error", { screen_name: "deposit_step_1", field_name: "amount" });
                      return;
                    }
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
              <h2 className="mb-4 text-sm font-semibold text-muted-foreground">Source account</h2>
              <div className="space-y-2">
                {BANKS.map((b) => (
                  <label
                    key={b.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 ${
                      bank === b.id ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <input type="radio" checked={bank === b.id} onChange={() => setBank(b.id)} />
                    <span className="text-sm">{b.name}</span>
                  </label>
                ))}
              </div>
              <div className="mt-6 flex justify-between">
                <button onClick={() => goto(1)} className="text-sm text-muted-foreground hover:text-foreground">
                  ← Back
                </button>
                <button
                  data-track="deposit_step2_next"
                  onClick={() => {
                    deposit(amount);
                    goto(3);
                  }}
                  className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
                >
                  Confirm deposit
                </button>
              </div>
            </div>
          )}
          {step === 3 && <DepositSuccess amount={amount} />}
        </Card>
      </div>
    </Shell>
  );
}

function DepositSuccess({ amount }: { amount: number }) {
  useEffect(() => {
    clearFlow();
    track("flow_completed", { flow_name: "deposit" });
  }, []);
  return (
    <div className="py-6 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gain/20 text-gain">
        ✓
      </div>
      <h2 className="text-xl font-semibold">Deposit initiated</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        ${fmt(amount)} will arrive in your account within 1–3 business days.
      </p>
      <Link
        to="/portfolio"
        className="mt-6 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        Back to portfolio
      </Link>
    </div>
  );
}