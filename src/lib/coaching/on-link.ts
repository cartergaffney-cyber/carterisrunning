import { prisma } from "@/lib/db";
import { compareRunToWorkout } from "./compare-run";
import { classifyActualEffortTier, classifyScheduledTier } from "./effort-tier";
import { generateCoachCommentary, commentaryCategoryKey } from "./commentary";
import { shouldPreferConciseCommentary } from "./commentary-feedback";
import { adaptFutureWorkouts } from "./adapt-plan";
import { getTrailingLongestRunMiles, assessSpikeRisk } from "./long-run-spike-risk";
import { diffInDays, today } from "@/lib/utils/date";
import type { WorkoutType } from "@/lib/plan-generator/types";
import type { PlannedWorkout, Run, TrainingPlan } from "@/generated/prisma/client";

const LONG_RUN_FAMILY = new Set<WorkoutType>(["LONG_RUN", "BACK_TO_BACK_LONG"]);

const HEART_RATE_BASELINE_SAMPLE_SIZE = 6;

/**
 * Runner's own recent average HR for the same workout type, excluding the
 * run currently being graded -- the personalized baseline the commentary
 * compares against, since absolute BPM isn't meaningfully comparable across
 * different people.
 */
async function computeHeartRateBaseline(
  userId: string,
  workoutType: WorkoutType,
  excludeRunId: string
): Promise<number | null> {
  const recent = await prisma.run.findMany({
    where: {
      userId,
      id: { not: excludeRunId },
      avgHeartRate: { not: null },
      plannedWorkout: { workoutType },
    },
    orderBy: { date: "desc" },
    take: HEART_RATE_BASELINE_SAMPLE_SIZE,
    select: { avgHeartRate: true },
  });
  if (recent.length === 0) return null;
  return recent.reduce((sum, r) => sum + (r.avgHeartRate ?? 0), 0) / recent.length;
}

interface GradedRun {
  run: Run;
  workout: PlannedWorkout & { trainingPlan: TrainingPlan };
  workoutType: WorkoutType;
  comparisonStatus: ReturnType<typeof compareRunToWorkout>;
  commentary: string;
  commentaryCategory: string;
}

async function gradeRun(runId: string, workoutId: string): Promise<GradedRun | null> {
  const [run, workout] = await Promise.all([
    prisma.run.findUnique({ where: { id: runId } }),
    prisma.plannedWorkout.findUnique({ where: { id: workoutId }, include: { trainingPlan: true } }),
  ]);
  if (!run || !workout) return null;

  const workoutType = workout.workoutType as WorkoutType;

  const comparison = compareRunToWorkout(run, {
    workoutType,
    targetDistanceMiles: workout.targetDistanceMiles,
    targetDurationMinutes: workout.targetDurationMinutes,
    targetPaceSecondsPerMile: workout.targetPaceSecondsPerMile,
  });

  const heartRateBaselineBpm = await computeHeartRateBaseline(workout.trainingPlan.userId, workoutType, run.id);
  const daysToRace = diffInDays(today(), workout.trainingPlan.raceDate);

  let spikeRisk = null;
  if (LONG_RUN_FAMILY.has(workoutType)) {
    const trailingLongest = await getTrailingLongestRunMiles(workout.trainingPlan.userId, run.date, run.id);
    spikeRisk = assessSpikeRisk(run.distanceMiles, trailingLongest);
  }

  const commentaryCategory = commentaryCategoryKey(workoutType, comparison?.status ?? null);
  const concise = await shouldPreferConciseCommentary(workout.trainingPlan.userId, commentaryCategory);

  const commentary = generateCoachCommentary({
    workoutType,
    phase: workout.phase,
    comparison,
    run,
    heartRateBaselineBpm,
    daysToRace,
    spikeRisk,
    varietySeed: run.id,
    adaptation: null,
    concise,
  });

  return { run, workout, workoutType, comparisonStatus: comparison, commentary, commentaryCategory };
}

/**
 * Grades a linked run against its workout and writes the resulting coach
 * commentary onto it. Used both by the live link pipeline (below) and to
 * backfill commentary onto runs linked before this feature existed, without
 * re-triggering the future-week adaptation logic against long-past weeks.
 */
export async function generateCommentaryForRun(runId: string, workoutId: string): Promise<void> {
  const graded = await gradeRun(runId, workoutId);
  if (!graded) return;
  await prisma.run.update({
    where: { id: runId },
    data: { coachCommentary: graded.commentary, commentaryCategory: graded.commentaryCategory },
  });
}

/**
 * Runs the full coaching pipeline for a run that was just linked to a
 * planned workout: grades the run against its target, decides whether it
 * represented unplanned hard-day stress that should soften an upcoming hard
 * session, and writes the resulting coach commentary (including a note
 * about that adjustment) onto the run. Called from both the Strava
 * auto-link path and the manual link-workout route so the two behave
 * identically.
 */
export async function runCoachingPipeline(runId: string, workoutId: string): Promise<void> {
  const graded = await gradeRun(runId, workoutId);
  if (!graded) return;
  const { run, workout, workoutType, comparisonStatus } = graded;

  const actualTier = classifyActualEffortTier(run, {
    easyPaceSecondsPerMile: workout.trainingPlan.easyPaceSecondsPerMile,
    tempoPaceSecondsPerMile: workout.trainingPlan.tempoPaceSecondsPerMile,
  });
  const scheduledTier = classifyScheduledTier(workoutType);

  const adaptation = await adaptFutureWorkouts({
    plan: workout.trainingPlan,
    originWorkout: { id: workout.id, date: workout.date, workoutType },
    actualTier,
    scheduledTier,
    comparisonStatus: comparisonStatus?.status ?? null,
  });

  let { commentary } = graded;
  if (adaptation) {
    commentary = `${commentary} ${adaptation.triggerSummary}`;
  }

  await prisma.run.update({
    where: { id: runId },
    data: { coachCommentary: commentary, commentaryCategory: graded.commentaryCategory },
  });
}
