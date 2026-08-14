import { HTMLAttributes } from "react";

/**
 * Elevation is carried by fill plus a 1px border, never a shadow. A panel is
 * the outer container; nested content steps to `--surface-muted` with the
 * lighter border so the two read as distinct layers rather than one blur.
 */
export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border border-border bg-surface p-6 ${className}`}
      {...props}
    />
  );
}

export function Panel({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`overflow-hidden rounded-[var(--radius-panel)] border border-border-strong bg-surface ${className}`}
      {...props}
    />
  );
}
