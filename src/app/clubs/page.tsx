import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DiscoverClubsButton } from "@/components/clubs/DiscoverClubsButton";
import { ClubCard } from "@/components/clubs/ClubCard";

export default async function ClubsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const clubs = await prisma.club.findMany({
    where: { userId: user.id },
    include: { sessions: true },
    orderBy: { createdAt: "desc" },
  });

  const tracked = clubs.filter((c) => c.status === "TRACKED");
  const candidates = clubs.filter((c) => c.status === "CANDIDATE");
  const dismissed = clubs.filter((c) => c.status === "DISMISSED");

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Run Clubs</h1>
        <DiscoverClubsButton />
      </div>

      {!user.homeCity && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Set your home address in{" "}
          <Link href="/settings" className="underline">
            Settings
          </Link>{" "}
          before discovering clubs.
        </p>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Tracked</h2>
        {tracked.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No tracked clubs yet — track a candidate below to have it matched against your training plan.
          </p>
        )}
        <div className="flex flex-col gap-3">
          {tracked.map((club) => (
            <ClubCard key={club.id} club={club} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Candidates</h2>
        {candidates.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No candidates yet — click &ldquo;Discover clubs&rdquo; above.
          </p>
        )}
        <div className="flex flex-col gap-3">
          {candidates.map((club) => (
            <ClubCard key={club.id} club={club} />
          ))}
        </div>
      </section>

      {dismissed.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Dismissed</h2>
          <div className="flex flex-col gap-3">
            {dismissed.map((club) => (
              <ClubCard key={club.id} club={club} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
