import { Database } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { api, type AppSchema } from "@/lib/api";

export function SchemaPanel({ appId }: { appId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["schema", appId],
    queryFn: () => api.getSchema(appId),
    enabled: Boolean(appId),
  });

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Database className="w-4 h-4" /> Schema
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Data schema</SheetTitle>
          <SheetDescription>
            Columns and known values for this application. The analyst chat and
            chart builder use this metadata to write correct SQL.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-8 space-y-6">
          {isLoading && (
            <div className="text-sm text-muted-foreground animate-pulse">Loading…</div>
          )}
          {data && (
            <>
              <TableSection title="events" schema={data.events} kind="events" />
              <TableSection title="feedback" schema={data.feedback} kind="feedback" />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function TableSection({
  title,
  schema,
  kind,
}: {
  title: string;
  schema: AppSchema["events"] | AppSchema["feedback"];
  kind: "events" | "feedback";
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold font-mono uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="border border-border rounded-lg divide-y divide-border bg-surface">
        {schema.columns.map((c) => (
          <div key={c.name} className="px-3 py-2 space-y-1 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono font-medium">{c.name}</span>
              <span className="font-mono text-muted-foreground">{c.type}</span>
              {typeof c.distinct_count === "number" && (
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface-2 border border-border text-muted-foreground">
                  {c.distinct_count.toLocaleString()} distinct
                </span>
              )}
              {c.description && (
                <span className="text-muted-foreground truncate">{c.description}</span>
              )}
            </div>
            {c.sample_values && c.sample_values.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {c.sample_values.slice(0, 5).map((v, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-2 border border-border text-muted-foreground max-w-[240px] truncate"
                    title={String(v)}
                  >
                    {v === null ? "null" : String(v)}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {kind === "events" && "event_names" in schema && (
        <div>
          <div className="text-xs font-medium mb-1.5 text-muted-foreground">
            Known event names
          </div>
          <div className="flex flex-wrap gap-1.5">
            {schema.event_names.map((n) => (
              <span
                key={n}
                className="text-[11px] font-mono px-1.5 py-0.5 rounded border border-border bg-surface-2"
              >
                {n}
              </span>
            ))}
          </div>
          <div className="text-xs font-medium mt-3 mb-1.5 text-muted-foreground">
            Common property keys
          </div>
          <div className="flex flex-wrap gap-1.5">
            {schema.sample_properties.map((n) => (
              <span
                key={n}
                className="text-[11px] font-mono px-1.5 py-0.5 rounded border border-border bg-surface-2"
              >
                {n}
              </span>
            ))}
          </div>
        </div>
      )}
      {kind === "feedback" && "topics" in schema && (
        <div>
          <div className="text-xs font-medium mb-1.5 text-muted-foreground">Topics</div>
          <div className="flex flex-wrap gap-1.5">
            {schema.topics.map((t) => (
              <span
                key={t}
                className="text-[11px] font-mono px-1.5 py-0.5 rounded border border-border bg-surface-2"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
