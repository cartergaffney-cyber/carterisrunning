export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Running Trainer</h1>
        <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
          Training plans, run club matching, and Strava-synced tracking.
        </p>
      </div>

      {error && (
        <p className="max-w-sm rounded-md bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          Sign-in failed ({error}). Please try again.
        </p>
      )}

      <a
        href="/api/auth/strava/login"
        className="flex h-12 items-center justify-center rounded-full px-6 text-base font-medium text-white transition-colors"
        style={{ backgroundColor: "#FC4C02" }}
      >
        Connect with Strava
      </a>
    </div>
  );
}
