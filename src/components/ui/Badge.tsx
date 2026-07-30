import { HTMLAttributes } from "react";

export type BadgeTone = "neutral" | "accent" | "success" | "info";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-surface-muted text-muted-foreground",
  accent: "bg-accent/10 text-accent",
  success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  info: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
};

export function Badge({ tone = "neutral", className = "", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]} ${className}`}
      {...props}
    />
  );
}
