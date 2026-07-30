"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeeklyMileagePoint } from "@/lib/stats/aggregate";

function formatWeekLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface TooltipPayloadEntry {
  color: string;
  name: string;
  value: number;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 text-muted-foreground">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-3" style={{ backgroundColor: entry.color }} />
          <span className="font-semibold">{entry.value.toFixed(1)} mi</span>
          <span className="text-muted-foreground">{entry.name}</span>
        </p>
      ))}
    </div>
  );
}

export function WeeklyMileageChart({ data }: { data: WeeklyMileagePoint[] }) {
  const hasData = data.some((d) => d.actualMiles > 0 || d.targetMiles > 0);

  if (!hasData) {
    return (
      <p className="text-sm text-muted-foreground">
        No mileage data yet — sync Strava or generate a training plan to see this chart.
      </p>
    );
  }

  const chartData = data.map((d) => ({
    week: formatWeekLabel(d.weekStart),
    Actual: Math.round(d.actualMiles * 10) / 10,
    Target: Math.round(d.targetMiles * 10) / 10,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} barGap={2}>
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
          width={36}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--chart-gridline)", opacity: 0.4 }} />
        <Legend wrapperStyle={{ fontSize: 12, color: "var(--chart-text-secondary)" }} />
        <Bar dataKey="Actual" fill="var(--chart-blue)" radius={[4, 4, 0, 0]} maxBarSize={24} />
        <Bar dataKey="Target" fill="var(--chart-green)" radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}
