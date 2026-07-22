import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { api } from "@/lib/api";
import { uiPrefs, useUIPrefs } from "@/lib/ui-prefs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function AppSwitcher() {
    const { currentAppId } = useUIPrefs();
    const { data: apps } = useSuspenseQuery({
        queryKey: ["applications"],
        queryFn: () => api.listApplications(),
    });

    const current = apps.find((a) => a.id === currentAppId) ?? apps[0];

    // Ensure a selection is persisted.
    if (current && current.id !== currentAppId) {
        uiPrefs.setCurrentAppId(current.id);
    }

    if (!current) {
        return <div className="text-sm text-muted-foreground">No applications</div>;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 max-w-[240px]">
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    <span className="truncate">{current.name}</span>
                    <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-70" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[260px]">
                <DropdownMenuLabel className="text-xs font-mono uppercase tracking-wide text-muted-foreground">
                    Applications
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {apps.map((a) => (
                    <DropdownMenuItem
                        key={a.id}
                        onClick={() => uiPrefs.setCurrentAppId(a.id)}
                        className="flex-col items-start gap-0.5"
                    >
                        <div className="flex items-center gap-2 w-full">
                            <span
                                className={`w-2 h-2 rounded-full ${a.id === current.id ? "bg-primary" : "bg-muted-foreground/40"}`}
                            />
                            <span className="font-medium">{a.name}</span>
                        </div>
                        {a.description && (
                            <span className="text-xs text-muted-foreground pl-4 truncate max-w-full">
                                {a.description}
                            </span>
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
