"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

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
        <Input
          id="address"
          type="text"
          placeholder="123 Main St, Austin, TX"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">
          Used to rank nearby run clubs and, later, as the start point for generated routes.
        </p>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {success && <p className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p>}

      <Button type="submit" disabled={submitting} className="w-fit">
        {submitting ? "Saving..." : "Save address"}
      </Button>
    </form>
  );
}
