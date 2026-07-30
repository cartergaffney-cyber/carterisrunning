"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PaceTrendPoint } from "@/lib/stats/aggregate";
import { formatPaceSecondsPerMile } from "@/lib/utils/pace";

function formatWeekLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 text-muted-foreground">{label}</p>
      <p className="flex items-center gap-1.5">
        <span className="inline-block h-0.5 w-3" style={{ backgroundColor: "var(--chart-blue)" }} />
        <span className="font-semibold">{formatPaceSecondsPerMile(payload[0].value)}</span>
      </p>
    </div>
  );
}

export function PaceTrendChart({ data }: { data: PaceTrendPoint[] }) {
  const hasData = data.some((d) => d.avgPaceSecondsPerMile !== null);

  if (!hasData) {
    return (
      <p className="text-sm text-muted-foreground">
        No pace data yet — sync Strava to see your weekly average pace here.
      </p>
    );
  }

  const chartData = data.map((d) => ({
    week: formatWeekLabel(d.weekStart),
    pace: d.avgPaceSecondsPerMile,
  }));

  return (
    <div className="flex flex-col gap-1">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData}>
          <CartesianGrid vertical={false} stroke="var(--chart-gridline)" />
          <XAxis
            dataKey="week"
            tick={{ fill: "var(--chart-muted)", fontSize: 12 }}
            axisLine={{ stroke: "var(--chart-baseline)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--chart-muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={44}
            tickFormatter={(value: number) => formatPaceSecondsPerMile(value).replace(" /mi", "")}
            domain={["dataMin - 15", "dataMax + 15"]}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--chart-baseline)" }} />
          <Line
            dataKey="pace"
            stroke="var(--chart-blue)"
            strokeWidth={2}
            dot={{ r: 4, fill: "var(--chart-blue)", strokeWidth: 2, stroke: "var(--background)" }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-muted-foreground">Lower is faster.</p>
    </div>
  );
}
