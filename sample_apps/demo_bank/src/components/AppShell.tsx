import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { identifyUser, track } from "@/lib/analytics";
import { clearCurrentUser, getCurrentUser } from "@/lib/user-portfolio";
import { User } from "lucide-react";

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const user = getCurrentUser();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">D</div>
            <span className="font-semibold tracking-tight">DemoBank</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <span className="px-3 py-1.5 text-muted-foreground hidden sm:flex items-center gap-2">
              <User className="h-4 w-4" />
              {user.name}
            </span>
            <button
              data-track="header_signout"
              onClick={() => {
                track("button_click", { screen_name: "header", element_label: "Sign out" });
                identifyUser(null);
                clearCurrentUser();
                navigate({ to: "/" });
              }}
              className="px-3 py-1.5 rounded-md hover:bg-secondary transition text-muted-foreground"
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-card border rounded-2xl shadow-sm ${className}`}>{children}</div>
  );
}

export function Stepper({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full ${i < current ? "bg-primary" : "bg-secondary"}`}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">Step {current} of {total}</span>
    </div>
  );
}
