import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, Card } from "@/components/Shell";
import { submitFeedback, track, useScreen } from "@/lib/analytics";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support — DemoTrade" },
      { name: "description", content: "Contact DemoTrade customer support." },
    ],
  }),
  component: Support,
});

const topics = [
  "General question",
  "Account & Login",
  "Trading & Execution",
  "Deposits & Withdrawals",
  "Feedback",
  "Report a problem",
];

function Support() {
  useScreen("support");
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("General question");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    let ok = true;
    if (!name) {
      track("form_error", { screen_name: "support", field_name: "name" });
      ok = false;
    }
    if (!email) {
      track("form_error", { screen_name: "support", field_name: "email" });
      ok = false;
    }
    if (!message) {
      track("form_error", { screen_name: "support", field_name: "message" });
      ok = false;
    }
    if (!ok) return;

    submitFeedback({ name, email, topic, message });
    track("button_click", {
      screen_name: "support",
      element_label: `Submit contact form: ${topic}`,
    });
    track("button_click", { screen_name: "support", button_label: "Send message" });
    setSent(true);
  }

  return (
    <Shell>
      <div className="mx-auto max-w-xl py-6">
        <h1 className="text-2xl font-semibold">DemoTrade Support</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Have a question or issue? Contact our support team below.
        </p>

        {sent ? (
          <Card className="mt-6 text-center py-8">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gain/20 text-gain text-xl font-bold">
              ✓
            </div>
            <h2 className="text-lg font-semibold">Message sent</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Thank you for reaching out. We will respond shortly.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                data-track="support_send_another"
                onClick={() => {
                  track("button_click", { screen_name: "support", button_label: "Send another" });
                  setSent(false);
                  setName("");
                  setEmail("");
                  setMessage("");
                  setTopic("General question");
                }}
                className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
              >
                Send another
              </button>
              <button
                data-track="support_back_portfolio"
                onClick={() => {
                  track("button_click", { screen_name: "support", button_label: "Back to portfolio" });
                  router.navigate({ to: "/portfolio" });
                }}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Back to portfolio
              </button>
            </div>
          </Card>
        ) : (
          <Card className="mt-6">
            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground">Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground">Topic</label>
                <select
                  value={topic}
                  onChange={(e) => {
                    setTopic(e.target.value);
                    track("button_click", {
                      screen_name: "support",
                      element_label: `Select topic: ${e.target.value}`,
                    });
                  }}
                  className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none"
                >
                  {topics.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  placeholder="How can we help?"
                  className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <button
                type="submit"
                data-track="support_submit"
                className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Send message
              </button>
            </form>
          </Card>
        )}
      </div>
    </Shell>
  );
}