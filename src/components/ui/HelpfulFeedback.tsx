"use client";

import { useState } from "react";

interface HelpfulFeedbackProps {
  endpoint: string;
  initialHelpful: boolean | null;
  label?: string;
  size?: "sm" | "xs";
}

function ThumbIcon({ down = false, className = "h-4 w-4" }: { down?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`${className} ${down ? "rotate-180" : ""}`}>
      <path
        d="M7 10v10H4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1h3Zm0 0 4.4-8.8a1 1 0 0 1 1.34-.45L14 1.5a1 1 0 0 1 .55 1.15L13 8h5.5a2 2 0 0 1 1.94 2.49l-1.8 7.5A2 2 0 0 1 16.7 19.5H7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Thumbs up/down vote widget, posted to `endpoint`. Used for both coach notes and per-run coach commentary. */
export function HelpfulFeedback({ endpoint, initialHelpful, label = "Was this helpful?", size = "sm" }: HelpfulFeedbackProps) {
  const [helpful, setHelpful] = useState<boolean | null>(initialHelpful);
  const [submitting, setSubmitting] = useState(false);
  const iconSize = size === "xs" ? "h-3.5 w-3.5" : "h-4 w-4";

  async function vote(value: boolean) {
    if (submitting) return;
    const previous = helpful;
    const optimistic = previous === value ? null : value;
    setHelpful(optimistic);
    setSubmitting(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ helpful: value }),
      });
      if (!response.ok) {
        setHelpful(previous);
        return;
      }
      const data = await response.json();
      setHelpful(data.helpful);
    } catch {
      setHelpful(previous);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <button
        type="button"
        onClick={() => vote(true)}
        disabled={submitting}
        aria-label="Helpful"
        aria-pressed={helpful === true}
        className={`rounded-full p-1 transition-colors disabled:opacity-50 ${
          helpful === true ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
        }`}
      >
        <ThumbIcon className={iconSize} />
      </button>
      <button
        type="button"
        onClick={() => vote(false)}
        disabled={submitting}
        aria-label="Not helpful"
        aria-pressed={helpful === false}
        className={`rounded-full p-1 transition-colors disabled:opacity-50 ${
          helpful === false ? "bg-red-500/10 text-red-600 dark:text-red-400" : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
        }`}
      >
        <ThumbIcon down className={iconSize} />
      </button>
    </div>
  );
}
