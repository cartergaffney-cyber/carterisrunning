"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AdherencePoint } from "@/lib/stats/aggregate";

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
    <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <p className="mb-1 text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="flex items-center gap-1.5">
        <span className="inline-block h-0.5 w-3" style={{ backgroundColor: "var(--chart-green)" }} />
        <span className="font-semibold">{Math.round(payload[0].value)}%</span>
      </p>
    </div>
  );
}

export function AdherenceChart({ data }: { data: AdherencePoint[] }) {
  const elapsedWeeks = data.filter((d) => d.adherencePct !== null);

  if (elapsedWeeks.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        No completed weeks yet — adherence appears once your plan is underway.
      </p>
    );
  }

  const chartData = elapsedWeeks.map((d) => ({
    week: `Wk ${d.weekNumber}`,
    adherence: Math.round(d.adherencePct!),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData}>
        <CartesianGrid vertical={false} stroke="var(--chart-gridline)" />
        <XAxis
          dataKey="week"
          tick={{ fill: "var(--chart-muted)", fontSize: 12 }}
          axisLine={{ stroke: "var(--chart-baseline)" }}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: "var(--chart-muted)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={36}
          tickFormatter={(value: number) => `${value}%`}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--chart-gridline)", opacity: 0.4 }} />
        <Bar dataKey="adherence" fill="var(--chart-green)" radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}
