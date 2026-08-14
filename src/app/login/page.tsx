import Image from "next/image";
import { TopoBadge } from "@/components/brand/TopoBadge";

const REASSURANCES = [
  "Your last 12 weeks set your starting paces automatically.",
  "Every new run syncs against the plan — no manual logging.",
  "We never post to your Strava. Read-only, revoke any time.",
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex h-[74px] items-center justify-between gap-4 border-b border-border px-6 sm:px-10">
        <div className="flex items-center gap-3">
          <TopoBadge size={30} />
          <span className="brand-display text-[21px] leading-none text-info">CARTER</span>
          <span className="brand-label hidden text-[11px] tracking-[0.28em] text-accent sm:inline">Is Running</span>
        </div>
        <span className="brand-label text-[11px] text-muted-foreground">
          Need an account? It&rsquo;s the same button.
        </span>
      </div>

      <div className="grid flex-1 lg:grid-cols-[1.05fr_.95fr]">
        <div className="flex flex-col justify-center gap-6 px-6 py-14 sm:px-12">
          <span className="brand-label text-xs tracking-[0.24em] text-info">Step 1 of 4</span>
          <h1 className="text-[clamp(34px,6vw,54px)]">
            One sign-in.
            <br />
            Your whole running history.
          </h1>
          <p className="max-w-[470px] text-[19px] leading-[1.6] text-muted-foreground">
            Connecting Strava is your login and your training data in one step — we read your runs so the plan starts
            from your real fitness, not a questionnaire guess.
          </p>

          {error && (
            <p className="max-w-[470px] text-[15px] text-danger">
              Sign-in failed ({error}). Please try again.
            </p>
          )}

          <a
            href="/api/auth/strava/login"
            className="brand-label inline-flex w-fit items-center justify-center rounded-full bg-strava px-8 py-4.5 text-sm font-bold text-white transition-[filter] hover:brightness-110"
          >
            Continue with Strava
          </a>

          <div className="flex flex-col gap-3 pt-2">
            {REASSURANCES.map((line, index) => (
              <div key={line} className="flex items-start gap-3">
                <span className="metric text-[15px] leading-[1.5] text-accent">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-base leading-[1.55] text-muted-foreground">{line}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative hidden min-h-[560px] lg:block">
          <Image
            src="/images/runners-dawn.jpg"
            alt="Three runners heading down a road at dawn"
            fill
            priority
            sizes="50vw"
            className="object-cover [filter:saturate(.9)]"
          />
          {/* Dissolves the photo's left edge into the copy column. */}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(46,46,48,.95),rgba(46,46,48,.25))]" />
          <div className="road absolute inset-x-0 bottom-0">
            <div className="road-dash" />
          </div>
        </div>
      </div>
    </div>
  );
}
