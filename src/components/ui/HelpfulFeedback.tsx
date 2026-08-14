"use client";

import { useState } from "react";

interface HelpfulFeedbackProps {
  endpoint: string;
  initialHelpful: boolean | null;
  label?: string;
  size?: "sm" | "xs";
}

/** Helpful / not-helpful vote, posted to `endpoint`. Used for coach notes and per-run commentary. */
export function HelpfulFeedback({ endpoint, initialHelpful, label = "Was this helpful?", size = "sm" }: HelpfulFeedbackProps) {
  const [helpful, setHelpful] = useState<boolean | null>(initialHelpful);
  const [submitting, setSubmitting] = useState(false);

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
    <div className="flex items-center gap-4">
      <span className={`brand-label text-faint-foreground ${size === "xs" ? "text-[10px]" : "text-[11px]"}`}>{label}</span>
      <button
        type="button"
        onClick={() => vote(true)}
        disabled={submitting}
        aria-pressed={helpful === true}
        className={`brand-label text-[11px] transition-colors disabled:opacity-45 ${
          helpful === true ? "text-info" : "text-faint-foreground hover:text-foreground"
        }`}
      >
        Helpful
      </button>
      <button
        type="button"
        onClick={() => vote(false)}
        disabled={submitting}
        aria-pressed={helpful === false}
        className={`brand-label text-[11px] transition-colors disabled:opacity-45 ${
          helpful === false ? "text-danger" : "text-faint-foreground hover:text-foreground"
        }`}
      >
        Not helpful
      </button>
    </div>
  );
}
