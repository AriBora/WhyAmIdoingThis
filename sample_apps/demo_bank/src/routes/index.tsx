import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { track, useScreenView } from "@/lib/analytics";
import { offerings, type Offering } from "@/lib/offerings";

export const Route = createFileRoute("/")({
  component: Landing,
});

const creditCards = offerings.filter((o) => o.category === "credit_card");
const debitCards = offerings.filter((o) => o.category === "debit_card");
const loans = offerings.filter((o) => o.category === "loan");
const investments = offerings.filter((o) => o.category === "investment");
const insurance = offerings.filter((o) => o.category === "insurance");

function Landing() {
  useScreenView("landing");
  const navigate = useNavigate();

  function openOffering(o: Offering) {
    track("offering_click", {
      screen_name: "landing",
      category: o.category,
      offering_id: o.id,
      offering_title: o.title,
    });
    track("button_click", { screen_name: "landing", button_label: o.title });
    navigate({ to: "/offerings/$id", params: { id: o.id } });
  }

  function navClick(label: string, to: "/login" | "/dashboard" | "/signup" | "/contact") {
    track("button_click", { screen_name: "landing", button_label: label });
    navigate({ to });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">D</div>
            <span className="font-semibold tracking-tight">DemoBank</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#credit-cards" data-track="nav_credit_cards" onClick={() => track("button_click", { screen_name: "landing", button_label: "Nav: Credit cards" })} className="hover:text-foreground transition">Credit cards</a>
            <a href="#debit-cards" data-track="nav_debit_cards" onClick={() => track("button_click", { screen_name: "landing", button_label: "Nav: Debit cards" })} className="hover:text-foreground transition">Debit cards</a>
            <a href="#loans" data-track="nav_loans" onClick={() => track("button_click", { screen_name: "landing", button_label: "Nav: Loans" })} className="hover:text-foreground transition">Loans</a>
            <a href="#investments" data-track="nav_investments" onClick={() => track("button_click", { screen_name: "landing", button_label: "Nav: Investments" })} className="hover:text-foreground transition">Investing</a>
            <a href="#insurance" data-track="nav_insurance" onClick={() => track("button_click", { screen_name: "landing", button_label: "Nav: Insurance" })} className="hover:text-foreground transition">Insurance</a>
            <Link to="/contact" data-track="nav_contact" onClick={() => track("button_click", { screen_name: "landing", button_label: "Nav: Contact" })} className="hover:text-foreground transition">Contact</Link>
          </nav>
          <div className="flex items-center gap-2">
            <button
              data-track="header_signin"
              onClick={() => navClick("Sign in", "/login")}
              className="px-3 py-1.5 rounded-md text-sm hover:bg-secondary transition"
            >
              Sign in
            </button>
            <button
              data-track="header_open_account"
              onClick={() => navClick("Open an account", "/signup")}
              className="px-3 py-1.5 rounded-md text-sm bg-primary text-primary-foreground hover:opacity-90 transition"
            >
              Open an account
            </button>
          </div>
        </div>
      </header>

      <section className="border-b bg-gradient-to-br from-primary to-indigo-900 text-primary-foreground">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-70 mb-3">Banking, simplified</p>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight">
              Everything you need to manage your money.
            </h1>
            <p className="mt-4 text-base md:text-lg opacity-80 max-w-lg">
              Checking, credit cards, loans, investing, and insurance — all in one place at DemoBank.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                data-track="hero_get_started"
                onClick={() => {
                  track("button_click", { screen_name: "landing", button_label: "Hero: Get started" });
                  navigate({ to: "/signup" });
                }}
                className="px-5 py-2.5 rounded-lg bg-white text-primary font-medium text-sm hover:opacity-90 transition"
              >
                Get started
              </button>
              <button
                data-track="hero_explore"
                onClick={() => {
                  track("button_click", { screen_name: "landing", button_label: "Hero: Explore offerings" });
                  const el = document.getElementById("credit-cards");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-5 py-2.5 rounded-lg border border-white/30 text-sm hover:bg-white/10 transition"
              >
                Explore offerings
              </button>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="relative">
              <div className="absolute -top-6 -left-6 h-56 w-80 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-800 shadow-2xl rotate-[-6deg] p-5 text-sm">
                <div className="opacity-70">DemoBank</div>
                <div className="mt-10 tracking-widest">•••• •••• •••• 4210</div>
                <div className="mt-4 flex justify-between text-xs opacity-80">
                  <span>ALEX MORGAN</span><span>12/28</span>
                </div>
              </div>
              <div className="ml-24 mt-10 h-56 w-80 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 shadow-2xl rotate-[4deg] p-5 text-sm">
                <div className="opacity-70">Travel Elite</div>
                <div className="mt-10 tracking-widest">•••• •••• •••• 8821</div>
                <div className="mt-4 flex justify-between text-xs opacity-80">
                  <span>ALEX MORGAN</span><span>05/29</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <OfferingSection
        id="credit-cards"
        eyebrow="Credit cards"
        title="Find a card that rewards how you spend"
        items={creditCards}
        onSelect={openOffering}
      />
      <OfferingSection
        id="debit-cards"
        eyebrow="Debit cards"
        title="Everyday banking, at your fingertips"
        items={debitCards}
        onSelect={openOffering}
      />
      <OfferingSection
        id="loans"
        eyebrow="Loans"
        title="Borrow with confidence"
        items={loans}
        onSelect={openOffering}
      />
      <OfferingSection
        id="investments"
        eyebrow="Investing"
        title="Grow your wealth on your terms"
        items={investments}
        onSelect={openOffering}
      />
      <OfferingSection
        id="insurance"
        eyebrow="Insurance"
        title="Protect what matters most"
        items={insurance}
        onSelect={openOffering}
      />

      <footer className="border-t bg-card">
        <div className="max-w-6xl mx-auto px-6 py-10 text-xs text-muted-foreground flex flex-wrap justify-between gap-4">
          <p>© {new Date().getFullYear()} DemoBank. Prototype for demonstration only. Not a real bank.</p>
          <div className="flex gap-4">
            <a href="#" data-track="footer_privacy" onClick={() => track("button_click", { screen_name: "landing", button_label: "Footer: Privacy" })} className="hover:text-foreground">Privacy</a>
            <a href="#" data-track="footer_security" onClick={() => track("button_click", { screen_name: "landing", button_label: "Footer: Security" })} className="hover:text-foreground">Security</a>
            <Link to="/contact" data-track="footer_contact" onClick={() => track("button_click", { screen_name: "landing", button_label: "Footer: Contact" })} className="hover:text-foreground">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function OfferingSection({
  id,
  eyebrow,
  title,
  items,
  onSelect,
}: {
  id: string;
  eyebrow: string;
  title: string;
  items: Offering[];
  onSelect: (o: Offering) => void;
}) {
  return (
    <section id={id} className="border-b">
      <div className="max-w-6xl mx-auto px-6 py-14">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{eyebrow}</p>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mt-1">{title}</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {items.map((o) => (
            <button
              key={o.id}
              data-track={`offering_${o.id}`}
              onClick={() => onSelect(o)}
              className="group text-left rounded-2xl border bg-card overflow-hidden hover:border-primary hover:shadow-lg transition shadow-sm"
            >
              <div className={`h-32 bg-gradient-to-br ${o.accent} p-4 flex flex-col justify-between text-white`}>
                <div className="text-[10px] uppercase tracking-widest opacity-80">DemoBank</div>
                <div className="text-sm font-medium">{o.title}</div>
              </div>
              <div className="p-5">
                <p className="text-sm text-muted-foreground min-h-[3rem]">{o.description}</p>
                <div className="mt-4 text-sm font-medium text-primary group-hover:underline">
                  {o.cta} →
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}