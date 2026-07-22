import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

export function FeedbackTable({ appId }: { appId: string }) {
    const [search, setSearch] = useState("");
    const [topic, setTopic] = useState<string>(ALL);

    const { data, isLoading } = useQuery({
        queryKey: ["feedback", appId, topic, search],
        queryFn: () =>
            api.listFeedback(appId, {
                limit: 100,
                topic: topic === ALL ? undefined : topic,
                search: search || undefined,
            }),
        enabled: Boolean(appId),
        refetchInterval: 120_000,
    });

    const topics = useMemo(() => {
        const set = new Set<string>();
        for (const r of data?.rows ?? []) set.add(r.topic);
        return Array.from(set);
    }, [data]);

    return (
        <div className="h-full flex flex-col">
            <div className="px-4 py-2 flex items-center gap-2 border-b border-border/60 shrink-0">
                <div className="relative flex-1 min-w-0">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search name, email, message…"
                        className="h-8 pl-8 text-xs"
                    />
                </div>
                <Select value={topic} onValueChange={setTopic}>
                    <SelectTrigger className="h-8 w-[140px] text-xs">
                        <SelectValue placeholder="All topics" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={ALL}>All topics</SelectItem>
                        {topics.map((t) => (
                            <SelectItem key={t} value={t}>
                                {t}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <div className="text-[11px] font-mono text-muted-foreground shrink-0">
                    {data?.rows.length ?? 0} rows
                </div>
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
                {isLoading ? (
                    <div className="p-4 text-xs text-muted-foreground animate-pulse">Loading…</div>
                ) : (
                    <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-surface z-[1] text-muted-foreground">
                            <tr className="text-left">
                                <th className="px-3 py-2 font-medium">Topic</th>
                                <th className="px-3 py-2 font-medium">Name</th>
                                <th className="px-3 py-2 font-medium">Message</th>
                                <th className="px-3 py-2 font-medium">Page</th>
                                <th className="px-3 py-2 font-medium text-right">When</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data?.rows ?? []).map((r) => (
                                <tr key={r.id} className="border-t border-border/60 hover:bg-surface-2/50">
                                    <td className="px-3 py-2 whitespace-nowrap">
                                        <span className="inline-block px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium">
                                            {r.topic}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap">
                                        <div className="font-medium">{r.name}</div>
                                        <div className="text-[10px] text-muted-foreground font-mono">{r.email}</div>
                                    </td>
                                    <td className="px-3 py-2 max-w-[360px]">
                                        <div className="line-clamp-2">{r.message}</div>
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap font-mono text-muted-foreground">
                                        {r.page_url}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-right font-mono text-muted-foreground">
                                        {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                                    </td>
                                </tr>
                            ))}
                            {!isLoading && (data?.rows.length ?? 0) === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                                        No feedback matches these filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
