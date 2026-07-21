import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, Card, Stepper } from "@/components/AppShell";
import { track, useFlowStep, useScreenView } from "@/lib/analytics";
import { loanState } from "@/lib/flow-state";

export const Route = createFileRoute("/loan/income")({
  component: LoanStep2,
});

function LoanStep2() {
  useScreenView("loan_step2");
  useFlowStep("loan_application", 2, "income_verification");
  const navigate = useNavigate();
  const [income, setIncome] = useState(loanState.income);
  const [employer, setEmployer] = useState(loanState.employer);
  const [uploaded, setUploaded] = useState(loanState.uploaded);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    let ok = true;
    if (!income) {
      track("form_error", { screen_name: "loan_step2", field_name: "income" });
      ok = false;
    }
    if (!employer) {
      track("form_error", { screen_name: "loan_step2", field_name: "employer" });
      ok = false;
    }
    if (!ok) return;
    loanState.income = income;
    loanState.employer = employer;
    loanState.uploaded = uploaded;
    track("button_click", { screen_name: "loan_step2", button_label: "Next" });
    navigate({ to: "/loan/review" });
  }

  return (
    <AppShell>
      <div className="max-w-xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Verify your income</h1>
          <Link to="/loan/help" data-track="loan_help" className="text-xs text-muted-foreground underline">Help</Link>
        </div>
        <Stepper current={2} total={4} />
        <Card className="p-6">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Annual income (USD)</label>
              <input
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                placeholder="e.g. 85000"
                inputMode="decimal"
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Upload proof of income</label>
              <div className="mt-1 border-2 border-dashed rounded-lg p-6 text-center">
                <p className="text-sm text-muted-foreground">PDF, PNG, or JPG · up to 10 MB</p>
                <button
                  type="button"
                  data-track="loan2_upload"
                  onClick={() => {
                    setUploaded(true);
                    track("button_click", { screen_name: "loan_step2", button_label: "Choose file" });
                  }}
                  className="mt-3 px-3 py-1.5 rounded-md border text-xs hover:bg-secondary"
                >
                  {uploaded ? "paystub_july.pdf ✓" : "Choose file"}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Employer name</label>
              <input
                value={employer}
                onChange={(e) => setEmployer(e.target.value)}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                data-track="loan2_back"
                onClick={() => navigate({ to: "/loan" })}
                className="px-4 py-2 rounded-lg border text-sm hover:bg-secondary"
              >
                Back
              </button>
              <button
                type="submit"
                data-track="loan2_next"
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