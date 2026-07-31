"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HelpfulFeedback } from "@/components/ui/HelpfulFeedback";

interface CoachNoteBannerProps {
  id: string;
  message: string;
  helpful?: boolean | null;
}

export function CoachNoteBanner({ id, message, helpful = null }: CoachNoteBannerProps) {
  const router = useRouter();
  const [dismissing, setDismissing] = useState(false);
  const [hidden, setHidden] = useState(false);

  async function dismiss() {
    setDismissing(true);
    setHidden(true);
    await fetch(`/api/coach-notes/${id}/dismiss`, { method: "POST" });
    router.refresh();
  }

  if (hidden) return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/5 p-4">
      <div className="flex flex-1 flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-accent">Coach&rsquo;s note</span>
        <p className="text-sm text-foreground">{message}</p>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/messages" className="text-xs font-medium text-accent underline">
            View all messages
          </Link>
          <HelpfulFeedback
            endpoint={`/api/coach-notes/${id}/feedback`}
            initialHelpful={helpful}
            label="Was this note helpful?"
          />
        </div>
      </div>
      <button
        onClick={dismiss}
        disabled={dismissing}
        aria-label="Dismiss"
        className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
