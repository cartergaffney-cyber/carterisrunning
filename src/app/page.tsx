import Image from "next/image";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { TopoBadge } from "@/components/brand/TopoBadge";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const SESSION_TONE: Record<string, string> = {
  TEMPO: "bg-[var(--fill-yellow)] text-accent",
  INTERVAL: "bg-[var(--fill-yellow)] text-accent",
  TRACK: "bg-[var(--fill-yellow)] text-accent",
  LONG_RUN: "bg-[var(--fill-pale)] text-[color:var(--brand-blue-pale)]",
  EASY: "bg-[var(--fill-blue)] text-info",
  SOCIAL: "bg-[var(--fill-blue)] text-info",
  UNKNOWN: "bg-surface-muted text-faint-foreground",
};

const SESSION_LABEL: Record<string, string> = {
  TEMPO: "Tempo",
  INTERVAL: "Intervals",
  TRACK: "Track",
  LONG_RUN: "Long run",
  EASY: "Easy",
  SOCIAL: "Social",
  UNKNOWN: "Group run",
};

/**
 * Real sessions from the club catalog, not sample data -- the whole claim of
 * this page is that the community is real, so inventing clubs to illustrate it
 * would undercut the one thing it's trying to say.
 *
 * Only sessions with a start time are shown: a schedule row whose time is
 * blank tells a visitor nothing, and most of what discovery scrapes has gaps.
 */
async function weeklyGroupRuns() {
  const sessions = await prisma.clubSession.findMany({
    where: { startTime: { not: null }, club: { status: { not: "DISMISSED" } } },
    include: { club: { select: { name: true, city: true, state: true } } },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  // One row per club so a single busy club can't fill the whole table.
  const seen = new Set<string>();
  const rows = [];
  for (const session of sessions) {
    if (seen.has(session.club.name)) continue;
    seen.add(session.club.name);
    rows.push(session);
    if (rows.length === 5) break;
  }
  return rows;
}

export default async function HomePage() {
  const user = await getCurrentUser();
  const [groupRuns, clubCount, sessionCount] = await Promise.all([
    weeklyGroupRuns(),
    prisma.club.count({ where: { status: { not: "DISMISSED" } } }),
    prisma.clubSession.count({ where: { club: { status: { not: "DISMISSED" } } } }),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      {!user && (
        <nav className="flex h-[74px] items-center justify-between gap-6 border-b border-border px-6 sm:px-10">
          <div className="flex items-center gap-3">
            <TopoBadge size={30} />
            <span className="brand-display text-[21px] leading-none text-info">CARTER</span>
            <span className="brand-label hidden text-[11px] tracking-[0.28em] text-accent sm:inline">
              Is Running
            </span>
          </div>
          <div className="hidden items-center gap-[30px] sm:flex">
            <a href="#group-runs" className="brand-label text-xs text-muted-foreground transition-colors hover:text-foreground">
              Group runs
            </a>
            <a href="#why" className="brand-label text-xs text-muted-foreground transition-colors hover:text-foreground">
              Why
            </a>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/login" className="brand-label text-xs text-foreground transition-colors hover:text-info">
              Log in
            </Link>
            <Link
              href="/login"
              className="brand-label rounded-full bg-accent px-5 py-2.5 text-xs font-bold text-accent-foreground transition-colors hover:bg-accent-hover"
            >
              Join a run
            </Link>
          </div>
        </nav>
      )}

      {/* Hero */}
      <section className="grid items-center gap-10 px-6 py-14 sm:px-10 lg:grid-cols-[1.02fr_.98fr] lg:gap-12 lg:py-16">
        <div className="flex flex-col gap-6">
          <span className="brand-label text-xs tracking-[0.24em] text-info">Est. 2026 · Community first</span>
          <h1 className="text-[clamp(40px,8vw,66px)] leading-[0.98]">
            Run with people.
            <br />
            Then build the{" "}
            <span className="text-info [box-shadow:inset_0_-10px_0_rgba(230,231,92,0.22)]">plan</span> around them.
          </h1>
          <p className="max-w-[470px] text-[19px] leading-[1.6] text-muted-foreground">
            Find the run clubs near you, then get a training plan that schedules itself around their weekly runs — so you
            never have to pick between the workout and the group.
          </p>
          <div className="flex flex-wrap items-center gap-3.5 pt-1">
            <Link
              href={user ? "/clubs" : "/login"}
              className="brand-label rounded-full bg-accent px-6 py-4 text-[13px] font-bold text-accent-foreground transition-colors hover:bg-accent-hover"
            >
              Find clubs near me
            </Link>
            <a
              href="#group-runs"
              className="brand-label rounded-full border border-border-strong px-6 py-4 text-[13px] font-semibold text-foreground transition-colors hover:bg-[rgba(255,255,255,0.05)]"
            >
              This week&rsquo;s runs
            </a>
          </div>
          <div className="mt-1.5 flex gap-9 border-t border-border pt-3.5">
            <Stat value={String(clubCount)} label="clubs tracked" />
            <Stat value={String(sessionCount)} label="weekly sessions" />
            <Stat value="5K–100mi" label="plans supported" />
          </div>
        </div>
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-border">
          <Image
            src="/images/hero-shadows.jpg"
            alt="Runners' long shadows across a road at sunrise"
            width={1280}
            height={961}
            priority
            className="h-[300px] w-full object-cover [filter:saturate(.94)_contrast(1.03)] sm:h-[470px]"
          />
        </div>
      </section>

      <div className="road">
        <div className="road-dash" />
      </div>

      {/* This week's group runs */}
      <section id="group-runs" className="flex flex-col gap-7 px-6 py-14 sm:px-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-col gap-2">
            <span className="brand-label text-xs tracking-[0.24em] text-info">Open to everyone</span>
            <h2 className="text-[clamp(28px,5vw,42px)]">This week&rsquo;s group runs</h2>
          </div>
          <Link href={user ? "/clubs" : "/login"} className="brand-label text-[13px] tracking-[0.12em] text-info">
            All {clubCount} clubs →
          </Link>
        </div>

        {groupRuns.length === 0 ? (
          <p className="text-base text-faint-foreground">
            No club schedules published yet — connect Strava and we&rsquo;ll find the ones near you.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="brand-label grid grid-cols-[130px_1fr_100px_140px] gap-5 border-b border-border-strong pb-3 text-[11px] text-faint-foreground">
                <span>Day / time</span>
                <span>Club</span>
                <span>Distance</span>
                <span>Session</span>
              </div>
              {groupRuns.map((session) => (
                <div
                  key={session.id}
                  className="grid grid-cols-[130px_1fr_100px_140px] items-center gap-5 border-b border-border py-5"
                >
                  <span className="metric text-[15px] leading-tight text-foreground">
                    {DAY_LABELS[session.dayOfWeek]}
                    <br />
                    <span className="text-[13px] font-normal text-faint-foreground">{session.startTime}</span>
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[17px] font-semibold text-foreground">{session.club.name}</span>
                    {(session.meetingLocation || session.club.city) && (
                      <span className="text-sm text-faint-foreground">
                        {session.meetingLocation ?? `${session.club.city}, ${session.club.state}`}
                      </span>
                    )}
                  </span>
                  <span className="metric text-[15px] text-muted-foreground">
                    {session.distanceMiles ? `${session.distanceMiles} mi` : "—"}
                  </span>
                  <span
                    className={`brand-label justify-self-start rounded-full px-3 py-1.5 text-[11px] ${
                      SESSION_TONE[session.type] ?? SESSION_TONE.UNKNOWN
                    }`}
                  >
                    {SESSION_LABEL[session.type] ?? SESSION_LABEL.UNKNOWN}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Why this exists */}
      <section id="why" className="grid items-center gap-11 px-6 py-14 sm:px-10 lg:grid-cols-[300px_1fr]">
        <Image
          src="/images/solo-road.jpg"
          alt="Running alone down a shaded road"
          width={1274}
          height={1019}
          className="h-[360px] w-full rounded-[var(--radius-card)] object-cover [filter:saturate(.94)] lg:w-[300px]"
        />
        <div className="flex flex-col gap-4">
          <span className="brand-label text-xs tracking-[0.24em] text-info">Why this exists</span>
          <p className="max-w-[640px] font-[family-name:var(--font-josefin-slab)] text-[clamp(22px,3.5vw,30px)] font-normal leading-[1.35] text-foreground">
            I started running seriously a few months ago. The thing that actually kept me going wasn&rsquo;t a plan — it
            was finding the local run clubs.
          </p>
          <p className="max-w-[620px] text-[18px] leading-[1.65] text-muted-foreground">
            So I built the tool I wanted: one that designs a training plan, then finds the club runs nearby whose
            sessions actually fit into it. The plan bends to the people you run with, not the other way around.
          </p>
          <div className="flex items-center gap-3 pt-1.5">
            <div className="h-0.5 w-[34px] bg-accent" />
            <span className="brand-label text-[13px] tracking-[0.16em] text-foreground">Carter Gaffney, founder</span>
          </div>
        </div>
      </section>

      {/* Photo strip */}
      <section className="grid gap-4 px-6 pb-14 sm:grid-cols-3 sm:px-10">
        {[
          { src: "/images/runners-dawn.jpg", alt: "Three runners on a road at dawn" },
          { src: "/images/group-overlook.jpg", alt: "Group of runners at an overlook" },
          { src: "/images/race-series.jpg", alt: "Runners after a summer series race" },
        ].map((photo) => (
          <Image
            key={photo.src}
            src={photo.src}
            alt={photo.alt}
            width={1280}
            height={960}
            className="h-[240px] w-full rounded-[var(--radius-media)] object-cover [filter:saturate(.94)]"
          />
        ))}
      </section>

      <footer className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-border bg-surface-muted px-6 py-6 sm:px-10">
        <div className="flex items-center gap-2.5">
          <TopoBadge size={26} />
          <span className="brand-label text-[11px] tracking-[0.28em] text-info">
            Carter Is Running · Est. 2026
          </span>
        </div>
        <div className="flex gap-6 text-sm text-faint-foreground">
          <Link href={user ? "/clubs" : "/login"}>Clubs</Link>
          <Link href={user ? "/calendar" : "/login"}>Plans</Link>
          <Link href={user ? "/races" : "/login"}>Races</Link>
        </div>
      </footer>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="metric text-[26px] leading-[1.1] text-info">{value}</span>
      <span className="text-[13px] tracking-[0.04em] text-faint-foreground">{label}</span>
    </div>
  );
}
