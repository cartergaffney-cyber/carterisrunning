import { HTMLAttributes } from "react";

export type BadgeTone = "neutral" | "accent" | "success" | "info" | "pale" | "warning" | "danger";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

/*
 * Every tone is an accent at low alpha over the dark ground -- never a new hue.
 * Session types map onto these: yellow for the hard days (tempo, intervals),
 * blue for easy, pale for long runs, neutral for rest.
 */
const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-surface-muted text-faint-foreground",
  accent: "bg-[var(--fill-yellow)] text-accent",
  warning: "bg-[var(--fill-yellow)] text-accent",
  info: "bg-[var(--fill-blue)] text-info",
  pale: "bg-[var(--fill-pale)] text-[color:var(--brand-blue-pale)]",
  success: "bg-[var(--fill-success)] text-success",
  danger: "bg-[rgba(240,134,106,0.16)] text-danger",
};

export function Badge({ tone = "neutral", className = "", ...props }: BadgeProps) {
  return (
    <span
      className={`brand-label inline-flex items-center rounded-full px-3 py-1.5 text-[11px] leading-none ${TONE_CLASSES[tone]} ${className}`}
      {...props}
    />
  );
}
