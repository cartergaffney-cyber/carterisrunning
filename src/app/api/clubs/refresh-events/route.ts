import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getValidAccessToken } from "@/lib/strava/client";
import { syncClubSessionsFromStrava } from "@/lib/clubs/strava-events-sync";

// Higher than the batch a background Strava sync uses: this one is explicitly
// asked for and waited on, so it's worth pulling more clubs per press. Still
// bounded, since each club costs a list request plus one per event and
// Strava's read limit is the real ceiling.
const MANUAL_REFRESH_CLUB_LIMIT = 8;

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = await getValidAccessToken(user);
  const result = await syncClubSessionsFromStrava(user.id, accessToken, {
    limit: MANUAL_REFRESH_CLUB_LIMIT,
  });

  return NextResponse.json(result);
}
