import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { autocompleteRaces } from "@/lib/race-catalog/search";
import { mapMetersToRaceDistance } from "@/lib/race-lookup/distance-mapping";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("q") ?? "";
  const results = await autocompleteRaces(query);

  return NextResponse.json({
    results: results.map((r) => ({
      id: r.id,
      name: r.name,
      commonName: r.commonName,
      raceDate: r.raceDate ? r.raceDate.toISOString() : null,
      city: r.city,
      state: r.state,
      distanceMeters: r.distanceMeters,
      logoUrl: r.logoUrl,
      description: r.description,
      source: r.source,
      suggestedRaceDistance: r.distanceMeters ? mapMetersToRaceDistance(r.distanceMeters) : null,
    })),
  });
}
