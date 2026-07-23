import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { login, useStore } from "@/lib/store";
import { identifyUser, track, useScreen } from "@/lib/analytics";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — DemoTrade" },
      { name: "description", content: "Sign in to your DemoTrade trading account." },
    ],
  }),
  component: Login,
});

function Login() {
  useScreen("login");
  const router = useRouter();
  const loggedIn = useStore((s) => s.loggedIn);
  const [email, setEmail] = useState("demo@demotrade.trade");
  const [password, setPassword] = useState("demo1234");

  useEffect(() => {
    if (loggedIn) router.navigate({ to: "/portfolio" });
  }, [loggedIn, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 h-10 w-10 rounded-lg bg-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">DemoTrade</h1>
          <p className="mt-1 text-sm text-muted-foreground">Trade smarter. Sleep easier.</p>
        </div>
        <form
          className="rounded-xl border border-border bg-card p-6 shadow-2xl"
          onSubmit={(e) => {
            e.preventDefault();
            const userEmail = email || "demo@demotrade.trade";
            identifyUser(userEmail);
            track("button_click", { screen_name: "login", button_label: "Sign in" });
            login(userEmail);
            router.navigate({ to: "/portfolio" });
          }}
        >
          <label className="mb-4 block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="mb-6 block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <button
            type="submit"
            data-track="login_submit"
            className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Sign in
          </button>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Demo prototype — any credentials work.
          </p>
        </form>
      </div>
    </div>
  );
}
