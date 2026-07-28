import { prisma } from "@/lib/db";

// Maps a planned workout type to the club session types that would
// reasonably fulfill it. Deliberately excludes REST, RACE_PACE,
// CROSS_TRAIN, and RACE -- a club session isn't a sensible substitute for
// any of those.
const COMPATIBLE_SESSION_TYPES: Partial<Record<string, string[]>> = {
  LONG_RUN: ["LONG_RUN"],
  BACK_TO_BACK_LONG: ["LONG_RUN"],
  TEMPO: ["TEMPO"],
  INTERVAL: ["INTERVAL", "TRACK"],
  EASY: ["EASY", "SOCIAL"],
};

/**
 * For each matchable planned workout without an existing suggestion, looks
 * for a confirmed session (on a TRACKED club) on the same day of week with
 * a compatible type. Only creates a suggestion when the match is
 * unambiguous (exactly one candidate) -- ties are left for the user to
 * resolve manually rather than guessed at.
 */
export async function matchWorkoutsToClubSessions(planId: string): Promise<number> {
  const plan = await prisma.trainingPlan.findUniqueOrThrow({
    where: { id: planId },
    include: { plannedWorkouts: { include: { clubSuggestion: true } } },
  });

  const trackedSessions = await prisma.clubSession.findMany({
    where: { isConfirmed: true, club: { userId: plan.userId, status: "TRACKED" } },
  });

  if (trackedSessions.length === 0) return 0;

  let matchedCount = 0;

  for (const workout of plan.plannedWorkouts) {
    if (workout.clubSuggestion) continue;

    const compatibleTypes = COMPATIBLE_SESSION_TYPES[workout.workoutType];
    if (!compatibleTypes) continue;

    const dayOfWeek = workout.date.getDay();
    const candidates = trackedSessions.filter(
      (session) => session.dayOfWeek === dayOfWeek && compatibleTypes.includes(session.type)
    );

    if (candidates.length === 1) {
      const session = candidates[0];
      await prisma.clubSuggestion.create({
        data: {
          plannedWorkoutId: workout.id,
          clubSessionId: session.id,
          matchScore: 1,
          matchReason: `${session.type.replace("_", " ").toLowerCase()} session on the same day as your ${workout.workoutType
            .replace("_", " ")
            .toLowerCase()}`,
        },
      });
      matchedCount++;
    }
  }

  return matchedCount;
}
