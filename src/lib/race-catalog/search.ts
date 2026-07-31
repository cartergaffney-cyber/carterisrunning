import { prisma } from "@/lib/db";
import { today } from "@/lib/utils/date";
import type { Race } from "@/generated/prisma/client";

const CANDIDATE_POOL_SIZE = 50;
const MIN_QUERY_LENGTH = 2;

/**
 * "Popular" isn't something most rows have real data for (RunSignup's API
 * doesn't expose entrant counts), so ranking is a deliberate, explainable
 * heuristic rather than a claimed true popularity score: curated majors
 * (a real signal -- these are, definitionally, the well-known races) rank
 * highest, then a prefix match on the name/common name, then participant
 * count where we do have it, then soonest upcoming date as a tiebreaker.
 * Fetches a modest candidate pool and ranks in application code rather than
 * in SQL, since Postgres enum column ordering doesn't reflect "curated
 * first" (CURATED was added to the enum after the original three values).
 */
function scoreCandidate(race: Race, lowerQuery: string): number {
  let score = 0;
  if (race.source === "CURATED") score += 1000;

  const nameLower = race.name.toLowerCase();
  const commonLower = race.commonName?.toLowerCase();
  if (nameLower.startsWith(lowerQuery) || commonLower?.startsWith(lowerQuery)) {
    score += 500;
  }

  score += Math.min(race.participantCount ?? 0, 100000) / 100; // up to +1000 for the biggest races

  return score;
}

export async function autocompleteRaces(query: string, limit = 8): Promise<Race[]> {
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY_LENGTH) return [];

  const candidates = await prisma.race.findMany({
    where: {
      raceDate: { gte: today() },
      OR: [
        { name: { contains: trimmed, mode: "insensitive" } },
        { commonName: { contains: trimmed, mode: "insensitive" } },
        { city: { contains: trimmed, mode: "insensitive" } },
      ],
    },
    take: CANDIDATE_POOL_SIZE,
  });

  const lowerQuery = trimmed.toLowerCase();

  return candidates
    .sort((a, b) => {
      const scoreDiff = scoreCandidate(b, lowerQuery) - scoreCandidate(a, lowerQuery);
      if (scoreDiff !== 0) return scoreDiff;
      return (a.raceDate?.getTime() ?? 0) - (b.raceDate?.getTime() ?? 0);
    })
    .slice(0, limit);
}
