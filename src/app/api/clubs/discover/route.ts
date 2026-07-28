import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { discoverClubs } from "@/lib/clubs/discovery";
import { parseClubSchedule } from "@/lib/clubs/parse-schedule";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user.homeCity) {
    return NextResponse.json(
      { error: "Set your home address in Settings before discovering clubs." },
      { status: 422 }
    );
  }

  const existingUrls = new Set(
    (await prisma.club.findMany({ where: { userId: user.id }, select: { websiteUrl: true } })).map(
      (c) => c.websiteUrl
    )
  );

  const candidates = await discoverClubs(user.id);
  const newCandidates = candidates.filter((c) => !existingUrls.has(c.websiteUrl));

  const created = await Promise.all(
    newCandidates.map((candidate) => {
      const sessions = parseClubSchedule(candidate.rawText);
      return prisma.club.create({
        data: {
          userId: user.id,
          name: candidate.name,
          websiteUrl: candidate.websiteUrl,
          sourceQuery: candidate.sourceQuery,
          discoverySource: candidate.discoverySource,
          status: "CANDIDATE",
          sessions: {
            create: sessions.map((s) => ({
              dayOfWeek: s.dayOfWeek,
              startTime: s.startTime,
              type: s.type,
              distanceMiles: s.distanceMiles,
              isConfirmed: false,
              rawText: s.rawText,
            })),
          },
        },
        include: { sessions: true },
      });
    })
  );

  return NextResponse.json({ created: created.length, clubs: created });
}
