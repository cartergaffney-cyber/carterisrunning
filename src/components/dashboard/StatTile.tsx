interface StatTileProps {
  label: string;
  value: string;
  unit?: string;
  subtitle?: string;
  /** 0-1. Renders the progress bar instead of a subtitle line. */
  progress?: number;
  tone?: "default" | "accent";
}

export function StatTile({ label, value, unit, subtitle, progress, tone = "default" }: StatTileProps) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[var(--radius-card)] border border-border bg-surface px-6 py-5">
      <span className="brand-label text-[11px] tracking-[0.2em] text-faint-foreground">{label}</span>
      <span className={`metric text-[36px] leading-none ${tone === "accent" ? "text-accent" : "text-foreground"}`}>
        {value}
        {unit && <span className="text-[18px] font-normal text-faint-foreground">{unit}</span>}
      </span>
      {progress !== undefined ? (
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[rgba(167,222,240,0.14)]">
          <div
            className="h-full rounded-full bg-info"
            style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
          />
        </div>
      ) : (
        subtitle && <span className="text-sm text-faint-foreground">{subtitle}</span>
      )}
    </div>
  );
}
