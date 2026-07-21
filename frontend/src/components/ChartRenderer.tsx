import {
  Bar,
  BarChart,
  CartesianGrid,
  
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Row = Record<string, unknown>;

type H = number | `${number}%`;

export function ChartRenderer({
  type,
  xKey,
  yKey,
  data,
  height = 240,
  color,
}: {
  type: "bar" | "line" | "funnel";
  xKey: string;
  yKey: string;
  data: Row[];
  height?: H;
  /** Hue 0-360; falls back to primary token. */
  color?: number;
}) {
  const stroke =
    typeof color === "number"
      ? `oklch(0.58 0.22 ${color})`
      : "var(--color-primary)";

  if (!Array.isArray(data) || data.length === 0) {
    return <div className="text-sm text-muted-foreground italic">No data.</div>;
  }

  if (type === "line") {
    return (
      <ResponsiveContainer width="100%" height={height as number}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey={xKey} stroke="var(--color-muted-foreground)" fontSize={12} />
          <YAxis stroke="var(--color-muted-foreground)" fontSize={12} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey={yKey}
            stroke={stroke}
            strokeWidth={2}
            dot={{ r: 3, fill: stroke }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  const isFunnel = type === "funnel";
  return (
    <ResponsiveContainer width="100%" height={height as number}>
      <BarChart
        data={data}
        layout={isFunnel ? "vertical" : "horizontal"}
        margin={{ top: 8, right: 24, left: isFunnel ? 24 : 0, bottom: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        {isFunnel ? (
          <>
            <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={12} />
            <YAxis
              type="category"
              dataKey={xKey}
              stroke="var(--color-muted-foreground)"
              fontSize={12}
              width={140}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey={xKey}
              stroke="var(--color-muted-foreground)"
              fontSize={12}
              interval={0}
              angle={data.length > 5 ? -20 : 0}
              textAnchor={data.length > 5 ? "end" : "middle"}
              height={data.length > 5 ? 60 : 30}
            />
            <YAxis stroke="var(--color-muted-foreground)" fontSize={12} allowDecimals={false} />
          </>
        )}
        <Tooltip
          contentStyle={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar
          dataKey={yKey}
          fill={stroke}
          radius={[6, 6, 6, 6]}
          isAnimationActive={false}
        />

      </BarChart>
    </ResponsiveContainer>
  );
}
