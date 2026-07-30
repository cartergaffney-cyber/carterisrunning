import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col">
      <nav className="flex items-center justify-between gap-6 border-b border-border px-6 py-4 sm:px-10">
        <div className="flex items-center gap-2">
          <Image src="/branding/carter-is-running-icon.svg" alt="" width={24} height={24} className="rounded-md" />
          <span className="text-sm font-semibold tracking-tight">Carter Is Running</span>
        </div>
        <div className="hidden items-center gap-8 sm:flex">
          <a href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Features
          </a>
          <a href="#how-it-works" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            How it works
          </a>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-foreground transition-colors hover:text-muted-foreground">
            Log in
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
          >
            Get started
          </Link>
        </div>
      </nav>

      <section className="flex flex-col items-center gap-6 px-6 py-20 text-center sm:py-28">
        <div className="relative h-56 w-full max-w-2xl overflow-hidden rounded-3xl shadow-sm sm:h-72">
          <Image
            src="/images/hero-runner.jpg"
            alt="Runner on an open road at sunrise"
            fill
            priority
            sizes="(min-width: 640px) 42rem, 100vw"
            className="object-cover"
          />
        </div>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-6xl">Carter Is Running</h1>
        <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
          Running informed by AI and powered by community.
        </p>
        <Link
          href="/login"
          className="mt-2 flex h-12 items-center justify-center rounded-full bg-accent px-7 text-base font-medium text-accent-foreground shadow-sm transition-colors hover:bg-accent-hover"
        >
          Get started
        </Link>
        <div className="flex gap-6 text-sm font-medium">
          <a href="#how-it-works" className="underline-offset-4 hover:underline">
            See how it works
          </a>
          <a href="#features" className="underline-offset-4 hover:underline">
            Explore features
          </a>
        </div>
      </section>

      <section id="features" className="mx-auto grid w-full max-w-5xl gap-10 px-6 py-20 sm:grid-cols-3 sm:px-10">
        <FeatureBlock
          icon={<PlanIcon />}
          title="Plans that adapt"
          description="Training plans built for your race, from 5K to 100 miles, tuned to your synced Strava fitness."
        />
        <FeatureBlock
          icon={<PeopleIcon />}
          title="Run with people nearby"
          description="Discover local run clubs and get matched to the sessions that fit your training schedule."
        />
        <FeatureBlock
          icon={<ChartIcon />}
          title="Backed by your data"
          description="Every synced run tracks adherence, pace, and mileage trends against your plan automatically."
        />
      </section>

      <section id="how-it-works" className="border-t border-border bg-surface-muted px-6 py-20 sm:px-10">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">How it works</h2>
          <ol className="flex flex-col gap-6">
            <Step
              number={1}
              title="Connect Strava"
              description="Sign in with Strava — it's your login and your running history in one step."
            />
            <Step
              number={2}
              title="Get your plan"
              description="Tell us your race and goal; we build a week-by-week plan around your real fitness."
            />
            <Step
              number={3}
              title="Get matched"
              description="We surface local run clubs and backup routes that fit your plan's schedule."
            />
          </ol>
        </div>
      </section>

      <footer className="mt-auto border-t border-border px-6 py-10 text-center sm:px-10">
        <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Carter Is Running</p>
      </footer>
    </div>
  );
}

function FeatureBlock({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center sm:items-start sm:text-left">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">{icon}</div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <li className="flex gap-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
        {number}
      </span>
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </li>
  );
}

function PlanIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v3M16 3v3" strokeLinecap="round" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15.5 12.5c2.9.4 4.5 2.1 5 4.5" strokeLinecap="round" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
      <path d="M4 20V10M12 20V4M20 20v-7" strokeLinecap="round" />
      <path d="M3 20h18" strokeLinecap="round" />
    </svg>
  );
}
