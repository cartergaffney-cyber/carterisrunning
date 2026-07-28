"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface AddressFormProps {
  currentAddress: string | null;
}

export function AddressForm({ currentAddress }: AddressFormProps) {
  const router = useRouter();
  const [address, setAddress] = useState(currentAddress ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/settings/address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(typeof body.error === "string" ? body.error : "Failed to geocode address.");
        return;
      }

      const data = await response.json();
      setSuccess(`Saved: ${data.formattedAddress}`);
      router.refresh();
    } catch {
      setError("Failed to geocode address.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="address" className="text-sm font-medium">
          Home address
        </label>
        <input
          id="address"
          type="text"
          placeholder="123 Main St, Austin, TX"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Used to rank nearby run clubs and, later, as the start point for generated routes.
        </p>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {success && <p className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-fit rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
      >
        {submitting ? "Saving..." : "Save address"}
      </button>
    </form>
  );
}
