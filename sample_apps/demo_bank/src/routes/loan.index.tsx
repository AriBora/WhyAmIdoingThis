import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, Card, Stepper } from "@/components/AppShell";
import { track, useFlowStep, useScreenView } from "@/lib/analytics";
import { loanState } from "@/lib/flow-state";

export const Route = createFileRoute("/loan/")({
  component: LoanStep1,
});

function LoanStep1() {
  useScreenView("loan_step1");
  useFlowStep("loan_application", 1, "amount_purpose");
  const navigate = useNavigate();
  const [amount, setAmount] = useState(loanState.amount);
  const [purpose, setPurpose] = useState(loanState.purpose);
  const [purposeOther, setPurposeOther] = useState(loanState.purposeOther);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    let ok = true;
    if (!amount || Number(amount) <= 0) {
      track("form_error", { screen_name: "loan_step1", field_name: "amount" });
      ok = false;
    }
    if (!purpose) {
      track("form_error", { screen_name: "loan_step1", field_name: "purpose" });
      ok = false;
    }
    if (purpose === "other" && !purposeOther) {
      track("form_error", { screen_name: "loan_step1", field_name: "purpose_other" });
      // Still allow through — friction demo
    }
    if (!ok) return;
    loanState.amount = amount;
    loanState.purpose = purpose;
    loanState.purposeOther = purposeOther;
    track("button_click", { screen_name: "loan_step1", button_label: "Next" });
    navigate({ to: "/loan/income" });
  }

  return (
    <AppShell>
      <div className="max-w-xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Apply for a loan</h1>
            <p className="text-sm text-muted-foreground">Fixed-rate personal loan, up to $50,000.</p>
          </div>
          <Link
            to="/loan/help"
            data-track="loan_help"
            className="text-xs text-muted-foreground underline"
          >
            Help
          </Link>
        </div>
        <Stepper current={1} total={4} />
        <Card className="p-6">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Loan amount (USD)</label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 10000"
                inputMode="decimal"
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Purpose</label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select a purpose…</option>
                <option value="debt">Debt consolidation</option>
                <option value="home">Home improvement</option>
                <option value="medical">Medical expenses</option>
                <option value="auto">Auto</option>
                <option value="other">Other (please specify)</option>
              </select>
              {purpose === "other" && (
                <input
                  value={purposeOther}
                  onChange={(e) => setPurposeOther(e.target.value)}
                  placeholder="Please specify your purpose"
                  className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                data-track="loan1_cancel"
                onClick={() => navigate({ to: "/dashboard" })}
                className="px-4 py-2 rounded-lg border text-sm hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                data-track="loan1_next"
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
              >
                Next
              </button>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}