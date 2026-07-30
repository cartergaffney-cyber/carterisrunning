import Image from "next/image";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <Image
        src="/branding/carter-is-running-icon.svg"
        alt=""
        width={64}
        height={64}
        className="rounded-2xl shadow-sm"
      />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Carter Is Running</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Training plans, run club matching, and Strava-synced tracking.
        </p>
      </div>

      {error && (
        <p className="max-w-sm rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          Sign-in failed ({error}). Please try again.
        </p>
      )}

      <a
        href="/api/auth/strava/login"
        className="flex h-12 items-center justify-center rounded-full px-6 text-base font-medium text-white shadow-sm transition-colors hover:brightness-110"
        style={{ backgroundColor: "#FC4C02" }}
      >
        Connect with Strava
      </a>
    </div>
  );
}
