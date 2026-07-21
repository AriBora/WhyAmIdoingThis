import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { track, useScreenView } from "@/lib/analytics";

export const Route = createFileRoute("/signup")({
  component: Signup,
});

function Signup() {
  useScreenView("signup");
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dob: "",
    ssnLast4: "",
    accountType: "checking",
    password: "",
    agree: false,
  });

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    let ok = true;
    const required: (keyof typeof form)[] = [
      "firstName", "lastName", "email", "phone", "dob", "ssnLast4", "password",
    ];
    for (const f of required) {
      if (!form[f]) {
        track("form_error", { screen_name: "signup", field_name: f });
        ok = false;
      }
    }
    if (!form.agree) {
      track("form_error", { screen_name: "signup", field_name: "agree" });
      ok = false;
    }
    if (!ok) return;
    track("account_opened", { account_type: form.accountType });
    track("button_click", { screen_name: "signup", button_label: "Open account" });
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">D</div>
            <span className="font-semibold tracking-tight">DemoBank</span>
          </Link>
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">Already a customer? Sign in</Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Open an account</h1>
        <p className="text-sm text-muted-foreground mt-1">It takes about 5 minutes. You'll need a government ID handy.</p>

        <form onSubmit={submit} className="mt-6 bg-card border rounded-2xl p-6 shadow-sm space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="First name" value={form.firstName} onChange={(v) => update("firstName", v)} />
            <Field label="Last name" value={form.lastName} onChange={(v) => update("lastName", v)} />
          </div>
          <Field label="Email" type="email" value={form.email} onChange={(v) => update("email", v)} placeholder="you@example.com" />
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Phone" type="tel" value={form.phone} onChange={(v) => update("phone", v)} placeholder="(555) 555-5555" />
            <Field label="Date of birth" type="date" value={form.dob} onChange={(v) => update("dob", v)} />
          </div>
          <Field label="Last 4 of SSN" value={form.ssnLast4} onChange={(v) => update("ssnLast4", v.replace(/\D/g, "").slice(0, 4))} placeholder="1234" />

          <div>
            <label className="text-sm font-medium">Account type</label>
            <div className="mt-2 grid sm:grid-cols-3 gap-2">
              {[
                { id: "checking", label: "Current" },
                { id: "savings", label: "Savings" },
                { id: "both", label: "Both" },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  data-track={`signup_account_${opt.id}`}
                  onClick={() => update("accountType", opt.id)}
                  className={`rounded-lg border px-3 py-2 text-sm text-left transition ${form.accountType === opt.id ? "border-primary bg-primary/5" : "hover:bg-secondary"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <Field label="Create a password" type="password" value={form.password} onChange={(v) => update("password", v)} />

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.agree}
              onChange={(e) => update("agree", e.target.checked)}
              className="mt-1"
            />
            <span className="text-muted-foreground">
              I agree to the DemoBank account terms and electronic disclosures.
            </span>
          </label>

          <button
            type="submit"
            data-track="signup_submit"
            className="w-full rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-medium hover:opacity-90 transition"
          >
            Open account
          </button>
          <p className="text-xs text-muted-foreground text-center">Demo mode — no real information is stored.</p>
        </form>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}