import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { track, useScreenView } from "@/lib/analytics";

export const Route = createFileRoute("/contact")({
  component: Contact,
});

const topics = ["General question", "Credit cards", "Loans", "Investing", "Insurance", "Feedback", "Report a problem"];

function Contact() {
  useScreenView("contact");
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("General question");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    let ok = true;
    if (!name) { track("form_error", { screen_name: "contact", field_name: "name" }); ok = false; }
    if (!email) { track("form_error", { screen_name: "contact", field_name: "email" }); ok = false; }
    if (!message) { track("form_error", { screen_name: "contact", field_name: "message" }); ok = false; }
    if (!ok) return;
    track("contact_submitted", {
      screen_name: "contact",
      topic,
      name,
      email,
      message,
      message_length: message.length,
    });
    track("button_click", { screen_name: "contact", button_label: "Send message" });
    setSent(true);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">D</div>
            <span className="font-semibold tracking-tight">DemoBank</span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Contact us</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Have a question or feedback? Send us a message and we'll get back to you.
        </p>

        {sent ? (
          <div className="mt-6 bg-card border rounded-2xl p-8 shadow-sm text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl">✓</div>
            <h2 className="mt-4 text-lg font-semibold">Thanks — we got it</h2>
            <p className="text-sm text-muted-foreground mt-1">A DemoBank teammate will reach out within one business day.</p>
            <div className="mt-6 flex gap-2 justify-center">
              <button
                data-track="contact_send_another"
                onClick={() => {
                  track("button_click", { screen_name: "contact", button_label: "Send another" });
                  setSent(false);
                  setName(""); setEmail(""); setMessage(""); setTopic("General question");
                }}
                className="px-4 py-2 rounded-lg border text-sm hover:bg-secondary"
              >
                Send another
              </button>
              <button
                data-track="contact_back_home"
                onClick={() => {
                  track("button_click", { screen_name: "contact", button_label: "Back to home" });
                  navigate({ to: "/" });
                }}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90"
              >
                Back to home
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 bg-card border rounded-2xl p-6 shadow-sm space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Your name</label>
                <input value={name} onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Topic</label>
              <select
                value={topic}
                onChange={(e) => {
                  setTopic(e.target.value);
                  track("contact_topic_selected", { topic: e.target.value });
                }}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {topics.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                placeholder="How can we help?"
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-y"
              />
              <p className="text-xs text-muted-foreground mt-1">{message.length} characters</p>
            </div>
            <button
              type="submit"
              data-track="contact_submit"
              className="w-full rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-medium hover:opacity-90 transition"
            >
              Send message
            </button>
            <p className="text-xs text-muted-foreground text-center">
              Submissions are sent to the analytics tracking platform for this demo.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}