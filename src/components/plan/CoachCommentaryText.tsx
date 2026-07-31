"use client";

import { useState } from "react";

// Below this length the text almost never wraps past two lines at card
// width, so the toggle would have nothing to reveal -- skip rendering it.
const SHOW_TOGGLE_THRESHOLD = 100;

export function CoachCommentaryText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const canToggle = text.length > SHOW_TOGGLE_THRESHOLD;

  return (
    <div className="flex flex-col items-start gap-1">
      <p className={`text-xs italic text-muted-foreground ${expanded ? "" : "line-clamp-2"}`}>{text}</p>
      {canToggle && (
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="text-xs font-medium text-accent underline"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
