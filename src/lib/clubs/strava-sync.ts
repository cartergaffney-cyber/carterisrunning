import { prisma } from "@/lib/db";
import { fetchAthleteClubs } from "@/lib/strava/client";

export interface StravaClubSyncResult {
  added: number;
  updated: number;
}

/**
 * Pulls the clubs the athlete has actually joined on Strava and tracks
 * them directly -- distinct from lib/clubs/discovery.ts's web-search-based
 * discovery, which surfaces *candidate* clubs nearby that still need the
 * user to confirm before tracking. Actual Strava membership is a much
 * stronger signal than a web-search guess, so these go straight to
 * TRACKED status with no confirmation step. Session schedules still need
 * confirming separately (Strava's club API doesn't expose meeting times),
 * same review flow as any other tracked club.
 */
export async function syncStravaClubs(userId: string, accessToken: string): Promise<StravaClubSyncResult> {
  const clubs = await fetchAthleteClubs(accessToken);

  let added = 0;
  let updated = 0;

  for (const club of clubs) {
    const data = {
      name: club.name,
      websiteUrl: club.url ? `https://www.strava.com/clubs/${club.url}` : `https://www.strava.com/clubs/${club.id}`,
      city: club.city ?? undefined,
      state: club.state ?? undefined,
      memberCount: club.member_count ?? undefined,
      discoverySource: "STRAVA_MEMBERSHIP" as const,
      status: "TRACKED" as const,
    };

    const existing = await prisma.club.findUnique({
      where: { userId_stravaClubId: { userId, stravaClubId: BigInt(club.id) } },
    });

    await prisma.club.upsert({
      where: { userId_stravaClubId: { userId, stravaClubId: BigInt(club.id) } },
      create: { userId, stravaClubId: BigInt(club.id), ...data },
      update: data,
    });

    if (existing) updated++;
    else added++;
  }

  return { added, updated };
}
