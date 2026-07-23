import { useState } from "react";

export type DonutSlice = { label: string; value: number; color: string };

export function Donut({
  slices,
  title,
  centerLabel,
}: {
  slices: DonutSlice[];
  title: string;
  centerLabel?: string;
}) {
  const total = slices.reduce((a, s) => a + s.value, 0) || 1;
  const [hover, setHover] = useState<number | null>(null);
  const r = 60;
  const cx = 80;
  const cy = 80;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 160 160" className="h-40 w-40 -rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--muted)" strokeWidth="20" />
        {slices.map((s, i) => {
          const len = (s.value / total) * c;
          const dash = `${len} ${c - len}`;
          const el = (
            <circle
              key={s.label}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={hover === i ? 24 : 20}
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "pointer", transition: "stroke-width 120ms" }}
            />
          );
          offset += len;
          return el;
        })}
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          fill="var(--muted-foreground)"
          fontSize="11"
          transform={`rotate(90 ${cx} ${cy})`}
        >
          {centerLabel ?? title}
        </text>
      </svg>
      <ul className="flex-1 space-y-1 text-xs">
        {slices.map((s, i) => (
          <li
            key={s.label}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            className={`flex items-center justify-between rounded px-1 py-0.5 ${
              hover === i ? "bg-accent" : ""
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
              <span className="text-muted-foreground">{s.label}</span>
            </span>
            <span className="mono">{((s.value / total) * 100).toFixed(2)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}