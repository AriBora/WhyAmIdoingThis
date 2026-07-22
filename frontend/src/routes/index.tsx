import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useEffect } from "react";
import { Palette, Moon, Sun } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { DashboardGrid } from "@/components/DashboardGrid";
import { ChatPanel } from "@/components/ChatPanel";
import { AppSwitcher } from "@/components/AppSwitcher";
import { SchemaPanel } from "@/components/SchemaPanel";
import { ChartBuilderDialog } from "@/components/ChartBuilderDialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { api } from "@/lib/api";
import { uiPrefs, useUIPrefs } from "@/lib/ui-prefs";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pulse · Multi-application analytics" },
      {
        name: "description",
        content:
          "Analytics portal for multiple applications with a natural-language analyst.",
      },
      { property: "og:title", content: "Pulse · Multi-application analytics" },
      {
        property: "og:description",
        content:
          "Track events, feedback, and custom charts across your applications.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { theme, accentHue, currentAppId } = useUIPrefs();
  const { data: apps = [] } = useQuery({
    queryKey: ["applications"],
    queryFn: () => api.listApplications(),
  });

  const appId = currentAppId ?? apps[0]?.id ?? "";

  useEffect(() => {
    const html = document.documentElement;
    if (theme === "dark") html.classList.add("dark");
    else html.classList.remove("dark");
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary", `oklch(0.58 0.22 ${accentHue})`);
    root.style.setProperty("--accent", `oklch(0.58 0.22 ${accentHue})`);
    root.style.setProperty("--ring", `oklch(0.58 0.22 ${accentHue})`);
  }, [accentHue]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-[1800px] mx-auto px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 shrink-0 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">
              P
            </div>
            <div className="min-w-0 hidden sm:block">
              <h1 className="text-sm font-semibold tracking-tight leading-none">Pulse</h1>
              <p className="text-[11px] text-muted-foreground font-mono">analytics portal</p>
            </div>
            <div className="ml-3">
              <AppSwitcher />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:block text-[11px] font-mono text-muted-foreground mr-1">
              live · 120s
            </div>
            {appId && <ChartBuilderDialog appId={appId} />}
            {appId && <SchemaPanel appId={appId} />}
            <ThemePopover />
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-6 py-6">
        {appId ? (
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6">
            <section className="min-w-0">
              <Suspense fallback={<Skeleton />}>
                <DashboardGrid appId={appId} />
              </Suspense>
            </section>
            <aside className="xl:sticky xl:top-18 xl:h-[calc(100vh-96px)]">
              <ChatPanel appId={appId} />
            </aside>
          </div>
        ) : (
          <div className="text-muted-foreground text-sm">No application selected.</div>
        )}
      </main>
    </div>
  );
}

function ThemePopover() {
  const { theme, accentHue } = useUIPrefs();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Palette className="w-4 h-4" /> Theme
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-3">
        <div className="text-xs font-semibold">Theme</div>
        <div className="flex gap-2">
          <Button
            variant={theme === "light" ? "default" : "outline"}
            size="sm"
            className="gap-2 flex-1"
            onClick={() => uiPrefs.setTheme("light")}
          >
            <Sun className="w-4 h-4" /> Light
          </Button>
          <Button
            variant={theme === "dark" ? "default" : "outline"}
            size="sm"
            className="gap-2 flex-1"
            onClick={() => uiPrefs.setTheme("dark")}
          >
            <Moon className="w-4 h-4" /> Dark
          </Button>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">Accent</span>
            <span
              className="w-5 h-5 rounded-full border border-border"
              style={{ background: `oklch(0.58 0.22 ${accentHue})` }}
            />
          </div>
          <Slider
            min={0}
            max={360}
            step={1}
            value={[accentHue]}
            onValueChange={(v) => uiPrefs.setAccentHue(v[0] ?? 265)}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Skeleton() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-surface border border-border rounded-2xl h-40 animate-pulse"
        />
      ))}
    </div>
  );
}
