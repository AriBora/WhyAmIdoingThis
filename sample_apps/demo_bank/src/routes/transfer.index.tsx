import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, Card, Stepper } from "@/components/AppShell";
import { track, useFlowStep, useScreenView } from "@/lib/analytics";
import { transferState } from "@/lib/flow-state";

export const Route = createFileRoute("/transfer/")({
  component: TransferStep1,
});

function TransferStep1() {
  useScreenView("transfer_step1");
  useFlowStep("transfer", 1, "enter_details");
  const navigate = useNavigate();
  const [recipient, setRecipient] = useState(transferState.recipient);
  const [amount, setAmount] = useState(transferState.amount);
  const [note, setNote] = useState(transferState.note);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    let ok = true;
    if (!recipient) {
      track("form_error", { screen_name: "transfer_step1", field_name: "recipient" });
      ok = false;
    }
    if (!amount || Number(amount) <= 0) {
      track("form_error", { screen_name: "transfer_step1", field_name: "amount" });
      ok = false;
    }
    if (!ok) return;
    transferState.recipient = recipient;
    transferState.amount = amount;
    transferState.note = note;
    track("button_click", { screen_name: "transfer_step1", button_label: "Continue" });
    navigate({ to: "/transfer/review" });
  }

  return (
    <AppShell>
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Transfer money</h1>
        <p className="text-sm text-muted-foreground mb-6">From Current · ••4210</p>
        <Stepper current={1} total={3} />
        <Card className="p-6">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Recipient</label>
              <input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Name, email, or account number"
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Amount (USD)</label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                inputMode="decimal"
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Memo (optional)</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What's this for?"
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                data-track="transfer1_cancel"
                onClick={() => navigate({ to: "/dashboard" })}
                className="px-4 py-2 rounded-lg border text-sm hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                data-track="transfer1_continue"
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
              >
                Continue
              </button>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}