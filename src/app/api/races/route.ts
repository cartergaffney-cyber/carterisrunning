import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { createRaceSchema } from "@/lib/validation/schemas";
import { findLogoUrl } from "@/lib/race-catalog/logo-lookup";
import { parseLocalDate } from "@/lib/utils/date";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createRaceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { raceDate, ...rest } = parsed.data;

  // A web-search result's sourceUrl *is* the race's own site (that's what the
  // fallback searched for), so it doubles as websiteUrl -- without this, a
  // race added this way has no link back to the organizer.
  const websiteUrl = rest.websiteUrl ?? (rest.source === "WEB_SEARCH" ? rest.sourceUrl : undefined);

  const race = await prisma.race.create({
    data: {
      ...rest,
      websiteUrl,
      raceDate: raceDate ? parseLocalDate(raceDate) : undefined,
      confirmedByUser: true,
    },
  });

  // Races added this way aren't in any synced source, so nothing else will
  // ever fill in their logo -- this is the one chance to grab it. Best-effort
  // and deliberately after create: a slow or dead race site must not stop the
  // race from being added.
  if (websiteUrl) {
    try {
      const logoUrl = await findLogoUrl(websiteUrl);
      if (logoUrl) await prisma.race.update({ where: { id: race.id }, data: { logoUrl } });
    } catch (error) {
      console.error("Logo lookup failed for", websiteUrl, error);
    }
  }

  return NextResponse.json({ id: race.id }, { status: 201 });
}
