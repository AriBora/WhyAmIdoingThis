import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell, Card, Stepper } from "@/components/AppShell";
import { track, useScreenView } from "@/lib/analytics";
import { transferState } from "@/lib/flow-state";

export const Route = createFileRoute("/transfer/success")({
  component: TransferSuccess,
});

function TransferSuccess() {
  useScreenView("transfer_success");
  const navigate = useNavigate();
  return (
    <AppShell>
      <div className="max-w-xl mx-auto">
        <Stepper current={3} total={3} />
        <Card className="p-8 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl">✓</div>
          <h1 className="text-2xl font-semibold tracking-tight mt-4">Transfer sent</h1>
          <p className="text-sm text-muted-foreground mt-2">
            ${Number(transferState.amount || 0).toFixed(2)} to {transferState.recipient || "recipient"} is on its way.
          </p>
          <p className="text-xs text-muted-foreground mt-1">Confirmation #TX-{Math.floor(Math.random() * 900000 + 100000)}</p>
          <button
            data-track="transfer_success_done"
            onClick={() => {
              track("button_click", { screen_name: "transfer_success", button_label: "Back to dashboard" });
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