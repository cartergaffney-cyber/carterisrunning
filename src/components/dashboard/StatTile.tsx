interface StatTileProps {
  label: string;
  value: string;
  subtitle?: string;
}

export function StatTile({ label, value, subtitle }: StatTileProps) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="text-2xl font-semibold">{value}</span>
      {subtitle && <span className="text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</span>}
    </div>
  );
}
