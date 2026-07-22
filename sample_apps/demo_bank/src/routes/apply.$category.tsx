import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, Card, Stepper } from "@/components/AppShell";
import { track, useScreenView } from "@/lib/analytics";
import { offerings, getOffering, categoryLabels, type OfferingCategory } from "@/lib/offerings";

type ApplySearch = { offering?: string };

const supported: OfferingCategory[] = ["credit_card", "debit_card", "investment", "insurance"];

export const Route = createFileRoute("/apply/$category")({
  component: ApplyPage,
  validateSearch: (s: Record<string, unknown>): ApplySearch => ({
    offering: typeof s.offering === "string" ? s.offering : undefined,
  }),
});

const slugToCategory: Record<string, OfferingCategory> = {
  account: "account",
  card: "credit_card",
  debit: "debit_card",
  investment: "investment",
  insurance: "insurance",
};

function ApplyPage() {
  const { category: slug } = useParams({ from: "/apply/$category" });
  const { offering: offeringId } = Route.useSearch();
  const navigate = useNavigate();
  const category = slugToCategory[slug];
  const offering = offeringId ? getOffering(offeringId) : undefined;

  useScreenView(`apply_${slug}`);

  const [step, setStep] = useState(1);
  const [product, setProduct] = useState(
    offering?.id || offerings.find((o) => o.category === category)?.id || ""
  );
  const [personal, setPersonal] = useState({ fullName: "", email: "", phone: "", address: "" });
  const [financial, setFinancial] = useState({ employment: "", income: "", ssnLast4: "" });

  if (!category) {
    return (
      <AppShell>
        <div className="max-w-md mx-auto text-center py-16">
          <h1 className="text-xl font-semibold">Unknown application</h1>
          <p className="text-sm text-muted-foreground mt-2">We couldn't find that application form.</p>
          <Link to="/dashboard" className="inline-block mt-4 text-sm text-primary underline">Go to dashboard</Link>
        </div>
      </AppShell>
    );
  }

  const options = offerings.filter((o) => o.category === category);
  const label = categoryLabels[category];

  function next() {
    if (step === 1 && !product) {
      track("form_error", { screen_name: `apply_${slug}`, field_name: "product" });
      return;
    }
    if (step === 2) {
      let ok = true;
      for (const [k, v] of Object.entries(personal)) {
        if (!v) { track("form_error", { screen_name: `apply_${slug}`, field_name: k }); ok = false; }
      }
      if (!ok) return;
    }
    if (step === 3) {
      let ok = true;
      for (const [k, v] of Object.entries(financial)) {
        if (!v) { track("form_error", { screen_name: `apply_${slug}`, field_name: k }); ok = false; }
      }
      if (!ok) return;
    }
    const nextStep = step + 1;
    track("flow_step", { flow_name: `apply_${category}`, step_number: nextStep, step_name: stepName(nextStep) });
    track("button_click", { screen_name: `apply_${slug}`, button_label: "Continue" });
    setStep(nextStep);
  }

  function submit() {
    track("flow_completed", { flow_name: `apply_${category}`, item_type: category === "investment" ? "investing" : category as "credit_card" | "debit_card" | "insurance", item_id: product });
    setStep(5);
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{label} application</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {offering ? offering.title : `Apply for a ${label.toLowerCase()}`}
          </h1>
        </div>
        {step <= 4 && <Stepper current={step} total={4} />}

        {step === 1 && (
          <Card className="p-6">
            <h2 className="font-semibold">Choose your product</h2>
            <div className="mt-4 space-y-2">
              {options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  data-track={`apply_${slug}_pick_${o.id}`}
                  onClick={() => setProduct(o.id)}
                  className={`w-full text-left rounded-lg border p-4 transition ${product === o.id ? "border-primary bg-primary/5" : "hover:bg-secondary"}`}
                >
                  <div className="text-sm font-medium">{o.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{o.tagline}</div>
                </button>
              ))}
            </div>
            <Nav onNext={next} onCancel={() => navigate({ to: "/dashboard" })} />
          </Card>
        )}

        {step === 2 && (
          <Card className="p-6 space-y-4">
            <h2 className="font-semibold">Personal information</h2>
            <Input label="Full name" value={personal.fullName} onChange={(v) => setPersonal({ ...personal, fullName: v })} />
            <Input label="Email" type="email" value={personal.email} onChange={(v) => setPersonal({ ...personal, email: v })} />
            <Input label="Phone" type="tel" value={personal.phone} onChange={(v) => setPersonal({ ...personal, phone: v })} />
            <Input label="Mailing address" value={personal.address} onChange={(v) => setPersonal({ ...personal, address: v })} />
            <Nav onNext={next} onBack={() => setStep(1)} />
          </Card>
        )}

        {step === 3 && (
          <Card className="p-6 space-y-4">
            <h2 className="font-semibold">Financial details</h2>
            <div>
              <label className="text-sm font-medium">Employment status</label>
              <select
                value={financial.employment}
                onChange={(e) => setFinancial({ ...financial, employment: e.target.value })}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select…</option>
                <option>Employed</option>
                <option>Self-employed</option>
                <option>Student</option>
                <option>Retired</option>
                <option>Not employed</option>
              </select>
            </div>
            <Input label="Annual income (USD)" value={financial.income} onChange={(v) => setFinancial({ ...financial, income: v })} />
            <Input label="Last 4 of SSN" value={financial.ssnLast4} onChange={(v) => setFinancial({ ...financial, ssnLast4: v.replace(/\D/g, "").slice(0, 4) })} />
            <Nav onNext={next} onBack={() => setStep(2)} />
          </Card>
        )}

        {step === 4 && (
          <Card className="p-6 space-y-4">
            <h2 className="font-semibold">Review your application</h2>
            <Row label="Product" value={getOffering(product)?.title || product} />
            <Row label="Name" value={personal.fullName} />
            <Row label="Email" value={personal.email} />
            <Row label="Phone" value={personal.phone} />
            <Row label="Address" value={personal.address} />
            <Row label="Employment" value={financial.employment} />
            <Row label="Annual income" value={`$${financial.income}`} />
            <Nav
              onBack={() => setStep(3)}
              onNext={submit}
              nextLabel="Submit application"
            />
          </Card>
        )}

        {step === 5 && (
          <Card className="p-8 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl">✓</div>
            <h2 className="mt-4 text-lg font-semibold">Application submitted</h2>
            <p className="text-sm text-muted-foreground mt-1">
              We're reviewing your {label.toLowerCase()} application. You'll get a decision within 1–2 business days.
            </p>
            <button
              data-track={`apply_${slug}_done`}
              onClick={() => {
                track("button_click", { screen_name: `apply_${slug}_done`, button_label: "Back to dashboard" });
                navigate({ to: "/dashboard" });
              }}
              className="mt-6 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90"
            >
              Back to dashboard
            </button>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

function stepName(n: number) {
  return ["", "select_product", "personal_info", "financial_info", "review", "submitted"][n] || "unknown";
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm border-b py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  );
}

function Nav({ onNext, onBack, onCancel, nextLabel = "Continue" }: {
  onNext: () => void;
  onBack?: () => void;
  onCancel?: () => void;
  nextLabel?: string;
}) {
  return (
    <div className="flex gap-2 pt-4">
      {onBack && (
        <button type="button" onClick={onBack} className="px-4 py-2 rounded-lg border text-sm hover:bg-secondary">Back</button>
      )}
      {onCancel && (
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border text-sm hover:bg-secondary">Cancel</button>
      )}
      <button type="button" onClick={onNext} className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
        {nextLabel}
      </button>
    </div>
  );
}

// Prevent unused import warning when supported list isn't referenced elsewhere.
void supported;
