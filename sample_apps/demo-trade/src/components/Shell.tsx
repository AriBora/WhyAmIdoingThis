import { Link, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { logout, useStore } from "@/lib/store";
import { identifyUser } from "@/lib/analytics";

export function Shell({ children }: { children: ReactNode }) {
  const loggedIn = useStore((s) => s.loggedIn);
  const email = useStore((s) => s.email);
  const router = useRouter();
  if (!loggedIn) {
    return <>{children}</>;
  }
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-sidebar/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-8">
            <Link to="/portfolio" className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-primary" />
              <span className="text-lg font-semibold tracking-tight">DemoTrade</span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <NavLink to="/portfolio" label="Portfolio" />
              <NavLink to="/explore" label="Explore" />
              <NavLink to="/deposit" label="Deposit" />
              <NavLink to="/support" label="Support" />
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">{email}</span>
            <button
              data-track="header_logout"
              onClick={() => {
                identifyUser(null);
                logout();
                router.navigate({ to: "/" });
              }}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}

function NavLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      activeProps={{ className: "bg-accent text-foreground" }}
      inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
      className="rounded-md px-3 py-1.5 transition-colors"
    >
      {label}
    </Link>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border bg-card p-6 ${className}`}>{children}</div>
  );
}

export function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}