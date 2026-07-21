import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell, Card, Stepper } from "@/components/AppShell";
import { completeFlow, track, useFlowStep, useScreenView } from "@/lib/analytics";
import { transferState } from "@/lib/flow-state";

export const Route = createFileRoute("/transfer/review")({
  component: TransferReview,
});

function TransferReview() {
  useScreenView("transfer_step2");
  useFlowStep("transfer", 2, "review");
  const navigate = useNavigate();

  function confirm() {
    track("button_click", { screen_name: "transfer_step2", button_label: "Confirm transfer" });
    completeFlow("transfer");
    navigate({ to: "/transfer/success" });
  }

  return (
    <AppShell>
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Review transfer</h1>
        <p className="text-sm text-muted-foreground mb-6">Double-check before sending.</p>
        <Stepper current={2} total={3} />
        <Card className="p-6 space-y-4">
          <Row label="To" value={transferState.recipient || "—"} />
          <Row label="Amount" value={`$${Number(transferState.amount || 0).toFixed(2)}`} big />
          <Row label="From" value="Current · ••4210" />
          <Row label="Memo" value={transferState.note || "—"} />
          <Row label="Arrives" value="Instantly" />
          <div className="flex gap-2 pt-2">
            <button
              data-track="transfer2_back"
              onClick={() => navigate({ to: "/transfer" })}
              className="px-4 py-2 rounded-lg border text-sm hover:bg-secondary"
            >
              Back
            </button>
            <button
              data-track="transfer2_confirm"
              onClick={confirm}
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
            >
              Confirm transfer
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