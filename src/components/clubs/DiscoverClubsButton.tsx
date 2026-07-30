"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function DiscoverClubsButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/clubs/discover", { method: "POST" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(typeof body.error === "string" ? body.error : "Discovery failed.");
        return;
      }
      const data = await response.json();
      setResult(`Found ${data.created} new club${data.created === 1 ? "" : "s"}.`);
      router.refresh();
    } catch {
      setError("Discovery failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button onClick={handleClick} disabled={loading} className="w-fit">
        {loading ? "Searching…" : "Discover clubs"}
      </Button>
      {result && <p className="text-xs text-muted-foreground">{result}</p>}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
