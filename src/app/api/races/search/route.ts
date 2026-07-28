import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { raceSearchSchema } from "@/lib/validation/schemas";
import { lookupRace } from "@/lib/race-lookup";
import { mapMetersToRaceDistance } from "@/lib/race-lookup/distance-mapping";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = raceSearchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const results = await lookupRace(parsed.data);

  return NextResponse.json({
    results: results.map((r) => ({
      ...r,
      raceDate: r.raceDate ? r.raceDate.toISOString() : null,
      suggestedRaceDistance: r.distanceMeters ? mapMetersToRaceDistance(r.distanceMeters) : null,
    })),
  });
}
