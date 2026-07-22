import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { identifyUser, track, useScreenView } from "@/lib/analytics";
import { setCurrentUser, users } from "@/lib/user-portfolio";

type LoginSearch = { redirect?: string };

export const Route = createFileRoute("/login")({
  component: Login,
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
});

function Login() {
  useScreenView("login");
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [selectedId, setSelectedId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      if (!email) track("form_error", { screen_name: "login", field_name: "email" });
      if (!password) track("form_error", { screen_name: "login", field_name: "password" });
      // Still let them through — prototype only.
    }

    const matchedUser = users.find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );

    const userId = matchedUser ? matchedUser.id : "u1";

    setSelectedId(userId);
    setCurrentUser(userId);
    identifyUser(userId);

    track("button_click", { screen_name: "login", element_label: "Sign in" });
    track("button_click", { screen_name: "login", button_label: "Sign in" });
    if (redirect) {
      track("button_click", { screen_name: "login", element_label: "Continue after sign in" });
      // redirect may be a full internal path with query string
      window.location.assign(redirect);
      return;
    }
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold">D</div>
            <span className="text-2xl font-semibold tracking-tight">DemoBank</span>
          </div>
          <h1 className="text-xl font-medium">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {redirect ? "Sign in to continue your application" : "Sign in to access your account"}
          </p>
        </div>
        <form onSubmit={submit} className="bg-card border rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            data-track="login_submit"
            className="w-full rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-medium hover:opacity-90 transition"
          >
            Sign in
          </button>
          <p className="text-xs text-muted-foreground text-center">
            Demo mode — any credentials work.
          </p>
        </form>
        <p className="text-center text-xs text-muted-foreground mt-4">
          New to DemoBank?{" "}
          <Link to="/signup" className="underline">Open an account</Link>
        </p>
      </div>
    </div>
  );
}
