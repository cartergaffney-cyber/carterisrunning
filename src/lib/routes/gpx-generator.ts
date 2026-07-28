import { prisma } from "@/lib/db";
import { generateOutAndBackRoute } from "./mapbox-directions";
import { buildGpxXml } from "./gpx-builder";

// Matches the fallback pace used in lib/plan-generator/workout-builder.ts
// for ultra long runs when no goal-time/fitness-derived pace is available.
const DEFAULT_PACE_MIN_PER_MILE = 12;

function slugifyWorkoutType(workoutType: string): string {
  return workoutType.toLowerCase().replace(/_/g, "-");
}

/**
 * Generates (or regenerates) a GPX route for a planned workout, starting
 * from the user's geocoded home address. Distance-based workouts use their
 * targetDistanceMiles directly; duration-based ones (ultra long runs) are
 * converted via the plan's derived long-run pace, falling back to a
 * default assumption if no paces were derived for that plan.
 */
export async function generateGpxForWorkout(workoutId: string) {
  const workout = await prisma.plannedWorkout.findUniqueOrThrow({
    where: { id: workoutId },
    include: { trainingPlan: { include: { user: true } } },
  });

  const user = workout.trainingPlan.user;
  if (!user.homeLat || !user.homeLng) {
    throw new Error("User has no geocoded home location -- set an address in Settings first");
  }

  const targetDistanceMiles =
    workout.targetDistanceMiles ??
    (workout.targetDurationMinutes
      ? workout.targetDurationMinutes /
        (workout.trainingPlan.longRunPaceSecondsPerMile
          ? workout.trainingPlan.longRunPaceSecondsPerMile / 60
          : DEFAULT_PACE_MIN_PER_MILE)
      : null);

  if (!targetDistanceMiles) {
    throw new Error("Workout has no target distance or duration to generate a route for");
  }

  const existing = await prisma.generatedRoute.findUnique({ where: { plannedWorkoutId: workoutId } });

  const routeRow = existing
    ? await prisma.generatedRoute.update({
        where: { id: existing.id },
        data: { status: "GENERATING", errorMessage: null, targetDistanceMiles },
      })
    : await prisma.generatedRoute.create({
        data: {
          plannedWorkoutId: workoutId,
          targetDistanceMiles,
          startLat: user.homeLat,
          startLng: user.homeLng,
          status: "GENERATING",
        },
      });

  try {
    const result = await generateOutAndBackRoute(user.homeLat, user.homeLng, targetDistanceMiles);

    const dateStr = workout.date.toISOString().slice(0, 10);
    const slug = slugifyWorkoutType(workout.workoutType);
    const fileName = `${dateStr}-${slug}-${result.actualDistanceMiles.toFixed(1)}mi.gpx`;

    const gpxContent = buildGpxXml({
      name: fileName.replace(".gpx", ""),
      points: result.points,
      createdAt: new Date(),
    });

    return await prisma.generatedRoute.update({
      where: { id: routeRow.id },
      data: {
        actualDistanceMiles: result.actualDistanceMiles,
        gpxContent,
        fileName,
        mapboxRaw: JSON.stringify(result.raw).slice(0, 50_000),
        status: "READY",
      },
    });
  } catch (error) {
    return await prisma.generatedRoute.update({
      where: { id: routeRow.id },
      data: { status: "FAILED", errorMessage: error instanceof Error ? error.message : String(error) },
    });
  }
}
