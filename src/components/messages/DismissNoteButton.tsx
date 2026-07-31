"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DismissNoteButton({ id }: { id: string }) {
  const router = useRouter();
  const [dismissing, setDismissing] = useState(false);

  async function dismiss() {
    setDismissing(true);
    await fetch(`/api/coach-notes/${id}/dismiss`, { method: "POST" });
    router.refresh();
  }

  return (
    <button
      onClick={dismiss}
      disabled={dismissing}
      className="text-xs font-medium text-accent underline disabled:opacity-50"
    >
      Mark as read
    </button>
  );
}
