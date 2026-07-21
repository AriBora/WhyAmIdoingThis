import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell, Card, Stepper } from "@/components/AppShell";
import { completeFlow, track, useFlowStep, useScreenView } from "@/lib/analytics";
import { loanState } from "@/lib/flow-state";

export const Route = createFileRoute("/loan/review")({
  component: LoanReview,
});

function LoanReview() {
  useScreenView("loan_step3");
  useFlowStep("loan_application", 3, "review");
  const navigate = useNavigate();

  const purposeLabel =
    loanState.purpose === "other"
      ? loanState.purposeOther || "Other"
      : loanState.purpose || "—";

  function submit() {
    track("button_click", { screen_name: "loan_step3", button_label: "Submit application" });
    completeFlow("loan_application");
    navigate({ to: "/loan/submitted" });
  }

  return (
    <AppShell>
      <div className="max-w-xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Review your application</h1>
          <Link to="/loan/help" data-track="loan_help" className="text-xs text-muted-foreground underline">Help</Link>
        </div>
        <Stepper current={3} total={4} />
        <Card className="p-6 space-y-3">
          <Row label="Loan amount" value={`$${Number(loanState.amount || 0).toLocaleString()}`} big />
          <Row label="Purpose" value={purposeLabel} />
          <Row label="Annual income" value={loanState.income ? `$${Number(loanState.income).toLocaleString()}` : "—"} />
          <Row label="Employer" value={loanState.employer || "—"} />
          <Row label="Proof of income" value={loanState.uploaded ? "Uploaded" : "Not provided"} />
          <Row label="Estimated APR" value="8.49% – 14.99%" />
          <div className="flex gap-2 pt-2">
            <button
              data-track="loan3_back"
              onClick={() => navigate({ to: "/loan/income" })}
              className="px-4 py-2 rounded-lg border text-sm hover:bg-secondary"
            >
              Back
            </button>
            <button
              data-track="loan3_submit"
              onClick={submit}
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
            >
              Submit application
            </button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function Row({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={big ? "text-xl font-semibold" : "text-sm font-medium"}>{value}</span>
    </div>
  );
}