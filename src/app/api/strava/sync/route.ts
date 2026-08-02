import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getValidAccessToken, fetchActivities } from "@/lib/strava/client";
import { upsertRuns, autoLinkRuns } from "@/lib/strava/sync";
import { syncStravaClubs } from "@/lib/clubs/strava-sync";
import { syncClubSessionsFromStrava } from "@/lib/clubs/strava-events-sync";
import { checkAndRecalibratePlan } from "@/lib/coaching/recalibrate-plan";
import { addDays } from "@/lib/utils/date";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = await getValidAccessToken(user);

  // A 1-day lookback buffer catches activities edited after their original sync.
  const after = user.lastSyncedAt ? addDays(user.lastSyncedAt, -1) : undefined;

  const activities = await fetchActivities(accessToken, after);
  const { createdCount, updatedCount, upsertedRunIds } = await upsertRuns(user.id, activities);
  const { linkedCount } = await autoLinkRuns(user.id, upsertedRunIds);
  await checkAndRecalibratePlan(user.id);

  // Best-effort: a clubs-fetch failure (e.g. a token scope gap) shouldn't
  // fail the whole sync when the run-import part succeeded fine.
  let clubs: { added: number; updated: number } | null = null;
  let clubSessions: { clubsProcessed: number; sessionsAdded: number; sessionsUpdated: number } | null = null;
  try {
    clubs = await syncStravaClubs(user.id, accessToken);
    clubSessions = await syncClubSessionsFromStrava(user.id, accessToken);
  } catch (error) {
    console.error("Strava club sync failed:", error);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastSyncedAt: new Date() },
  });

  return NextResponse.json({
    created: createdCount,
    updated: updatedCount,
    linked: linkedCount,
    clubs,
    clubSessions,
  });
}
