import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell, Card } from "@/components/AppShell";
import { track, useScreenView } from "@/lib/analytics";
import {
  getCurrentUser,
  ownedCategories,
  suggestedOfferings,
  type Holding,
} from "@/lib/user-portfolio";
import { categoryLabels, applyPathFor, type Offering, type OfferingCategory } from "@/lib/offerings";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

const sectionOrder: OfferingCategory[] = [
  "account",
  "debit_card",
  "credit_card",
  "loan",
  "investment",
  "insurance",
];

const sectionCopy: Record<OfferingCategory, { title: string; empty: string }> = {
  account: { title: "Accounts", empty: "You don't have a checking account yet." },
  debit_card: { title: "Debit cards", empty: "Add a DemoBank debit card to make withdrawals." },
  credit_card: { title: "Credit cards", empty: "Add a DemoBank credit card to earn rewards." },
  loan: { title: "Loans", empty: "No active loans. Explore financing when you need it." },
  investment: { title: "Investing", empty: "Start building wealth with a DemoBank investment account." },
  insurance: { title: "Insurance", empty: "Protect what matters with a DemoBank policy." },
};

function Dashboard() {
  useScreenView("dashboard");
  const navigate = useNavigate();
  const user = getCurrentUser();
  const holdings = user.holdings;
  const transactions = user.transactions;
  const owned = ownedCategories(user);
  const { missing, upsells } = suggestedOfferings(user);

  const totalAssets = holdings
    .filter((h) => h.category === "debit_card" || h.category === "investment" || h.category === "account")
    .reduce((sum, h) => sum + parseMoney(h.primary), 0);
  const totalDebt = holdings
    .filter((h) => h.category === "credit_card" || h.category === "loan")
    .reduce((sum, h) => sum + parseMoney(h.primary), 0);

  function quickAction(label: string, to: "/transfer" | "/loan" | "/contact") {
    track("button_click", { screen_name: "dashboard", button_label: label });
    navigate({ to });
  }

  function openHolding(h: Holding) {
    track("holding_click", {
      screen_name: "dashboard",
      holding_id: h.id,
      category: h.category,
      offering_id: h.offeringId,
    });
    navigate({ to: "/offerings/$id", params: { id: h.offeringId } });
  }

  function openOffering(o: Offering, source: "explore" | "upsell") {
    track("offering_click", {
      screen_name: "dashboard",
      source,
      category: o.category,
      offering_id: o.id,
      offering_title: o.title,
    });
    navigate({ to: "/offerings/$id", params: { id: o.id } });
  }

  function applyDirect(category: OfferingCategory) {
    track("button_click", {
      screen_name: "dashboard",
      button_label: `Explore ${categoryLabels[category]}`,
    });
    navigate({ to: applyPathFor(category) as "/loan" });
  }

  return (
    <AppShell>
      {/* Greeting + summary */}
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-muted-foreground">Good morning, {user.name.split(" ")[0]}</p>
          <h1 className="text-2xl font-semibold tracking-tight">Your financial overview</h1>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Net position</p>
          <p className="text-2xl font-semibold tracking-tight">
            ${(totalAssets - totalDebt).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-[11px] text-muted-foreground">
            ${totalAssets.toLocaleString(undefined, { maximumFractionDigits: 0 })} assets ·
            ${totalDebt.toLocaleString(undefined, { maximumFractionDigits: 0 })} debt
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-3 gap-3 mb-10">
        <button
          data-track="dashboard_transfer"
          onClick={() => quickAction("Transfer Money", "/transfer")}
          className="rounded-2xl border bg-card p-5 text-left hover:border-primary transition shadow-sm"
        >
          <div className="text-sm text-muted-foreground">Move funds</div>
          <div className="font-medium mt-1">Transfer Money →</div>
        </button>
        <button
          data-track="dashboard_loan"
          onClick={() => quickAction("Apply for a Loan", "/loan")}
          className="rounded-2xl border bg-card p-5 text-left hover:border-primary transition shadow-sm"
        >
          <div className="text-sm text-muted-foreground">Financing</div>
          <div className="font-medium mt-1">Apply for a Loan →</div>
        </button>
        <button
          data-track="dashboard_contact"
          onClick={() => quickAction("Contact support", "/contact")}
          className="rounded-2xl border bg-card p-5 text-left hover:border-primary transition shadow-sm"
        >
          <div className="text-sm text-muted-foreground">Support</div>
          <div className="font-medium mt-1">Contact us →</div>
        </button>
      </div>

      {/* Owned holdings by category, with empty-state prompts */}
      <div className="space-y-10">
        {sectionOrder.map((cat) => {
          const items = holdings.filter((h) => h.category === cat);
          return (
            <section key={cat}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold tracking-tight">{sectionCopy[cat].title}</h2>
                {owned.has(cat) ? (
                  <button
                    data-track={`dashboard_add_${cat}`}
                    onClick={() => applyDirect(cat)}
                    className="text-xs text-primary hover:underline"
                  >
                    + Add another
                  </button>
                ) : null}
              </div>
              {items.length === 0 ? (
                <EmptyCategoryPrompt
                  category={cat}
                  onExplore={() => applyDirect(cat)}
                />
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {items.map((h) => (
                    <HoldingCard key={h.id} h={h} onOpen={() => openHolding(h)} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Recent transactions */}
      <Card className="p-6 mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Recent transactions</h2>
          <span className="text-xs text-muted-foreground">Last 7 days</span>
        </div>
        <ul className="divide-y">
          {transactions.map((t) => (
            <li key={t.id} className="py-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.date} · {t.category}</div>
              </div>
              <div className={`text-sm font-medium ${t.amount < 0 ? "text-foreground" : "text-emerald-600"}`}>
                {t.amount < 0 ? "-" : "+"}${Math.abs(t.amount).toFixed(2)}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {/* Explore new services */}
      <section className="mt-12">
        <div className="mb-4">
          <h2 className="text-lg font-semibold tracking-tight">Explore new services</h2>
          <p className="text-sm text-muted-foreground">
            Handpicked for you based on what you already have with DemoBank.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[...missing.slice(0, 3), ...upsells.slice(0, 3)].map((o) => (
            <button
              key={o.id}
              data-track={`dashboard_explore_${o.id}`}
              onClick={() => openOffering(o, missing.includes(o) ? "explore" : "upsell")}
              className="group text-left rounded-2xl border bg-card overflow-hidden hover:border-primary hover:shadow-lg transition shadow-sm"
            >
              <div className={`h-24 bg-gradient-to-br ${o.accent} p-4 flex flex-col justify-between text-white`}>
                <div className="text-[10px] uppercase tracking-widest opacity-80">
                  {categoryLabels[o.category]}
                </div>
                <div className="text-sm font-medium">{o.title}</div>
              </div>
              <div className="p-4">
                <p className="text-xs text-muted-foreground line-clamp-2">{o.tagline}</p>
                <div className="mt-3 text-xs font-medium text-primary group-hover:underline">
                  Learn more →
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function HoldingCard({ h, onOpen }: { h: Holding; onOpen: () => void }) {
  return (
    <button
      data-track={`holding_${h.id}`}
      onClick={onOpen}
      className="text-left rounded-2xl border bg-card overflow-hidden hover:border-primary hover:shadow-md transition shadow-sm"
    >
      <div className={`bg-gradient-to-br ${h.accent} text-white px-5 py-4`}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{h.name}</p>
          <span className="text-[10px] uppercase tracking-widest opacity-80">
            {categoryLabels[h.category]}
          </span>
        </div>
        <p className="text-xs opacity-80 mt-0.5">{h.subtitle}</p>
      </div>
      <div className="px-5 py-4">
        <p className="text-xl font-semibold tracking-tight">{h.primary}</p>
        {h.secondary && <p className="text-xs text-muted-foreground mt-0.5">{h.secondary}</p>}
        <div className="mt-3 flex gap-2 text-xs">
          <span className="text-primary font-medium">Manage →</span>
        </div>
      </div>
    </button>
  );
}

function EmptyCategoryPrompt({
  category,
  onExplore,
}: {
  category: OfferingCategory;
  onExplore: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed bg-card/50 p-6 flex items-center justify-between gap-4 flex-wrap">
      <div>
        <p className="text-sm font-medium">{sectionCopy[category].empty}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Browse DemoBank {categoryLabels[category].toLowerCase()} options — apply in minutes.
        </p>
      </div>
      <button
        data-track={`dashboard_empty_${category}`}
        onClick={onExplore}
        className="px-4 py-2 rounded-lg border text-sm font-medium hover:border-primary hover:text-primary transition"
      >
        Explore {categoryLabels[category].toLowerCase()}s
      </button>
    </div>
  );
}

function parseMoney(s: string): number {
  return Number(s.replace(/[^0-9.-]/g, "")) || 0;
}