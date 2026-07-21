import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell, Card, Stepper } from "@/components/AppShell";
import { track, useScreenView } from "@/lib/analytics";

export const Route = createFileRoute("/loan/submitted")({
  component: LoanSubmitted,
});

function LoanSubmitted() {
  useScreenView("loan_submitted");
  const navigate = useNavigate();
  return (
    <AppShell>
      <div className="max-w-xl mx-auto">
        <Stepper current={4} total={4} />
        <Card className="p-8 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl">⏳</div>
          <h1 className="text-2xl font-semibold tracking-tight mt-4">Application submitted</h1>
          <p className="text-sm text-muted-foreground mt-2">
            We're reviewing your application. You'll hear from us within 2 business days.
          </p>
          <p className="text-xs text-muted-foreground mt-1">Reference #LN-{Math.floor(Math.random() * 900000 + 100000)}</p>
          <button
            data-track="loan_submitted_done"
            onClick={() => {
              track("button_click", { screen_name: "loan_submitted", button_label: "Back to dashboard" });
              navigate({ to: "/dashboard" });
            }}
            className="mt-6 w-full rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-medium hover:opacity-90"
          >
            Back to dashboard
          </button>
        </Card>
      </div>
    </AppShell>
  );
}