import { createFileRoute } from "@tanstack/react-router";
import { useScreenView } from "@/lib/analytics";

export const Route = createFileRoute("/loan/help")({
  component: LoanHelp,
});

function LoanHelp() {
  useScreenView("loan_help_broken");
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-3">🚧</div>
        <h1 className="text-lg font-semibold">This page isn't available</h1>
        <p className="text-sm text-muted-foreground mt-2">
          We couldn't load help right now. Please try again later.
        </p>
      </div>
    </div>
  );
}