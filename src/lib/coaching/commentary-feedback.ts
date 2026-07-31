import { prisma } from "@/lib/db";

export interface HelpfulnessStats {
  up: number;
  down: number;
  total: number;
  downRatio: number | null;
}

async function computeStats(where: { commentaryCategory: string; userId?: string }): Promise<HelpfulnessStats> {
  const [up, down] = await Promise.all([
    prisma.run.count({ where: { ...where, commentaryHelpful: true } }),
    prisma.run.count({ where: { ...where, commentaryHelpful: false } }),
  ]);
  const total = up + down;
  return { up, down, total, downRatio: total > 0 ? down / total : null };
}

/** This one user's thumbs-up/down history for a given commentary category (e.g. "EASY:TOO_HARD"). */
export function getUserCategoryHelpfulness(userId: string, category: string): Promise<HelpfulnessStats> {
  return computeStats({ userId, commentaryCategory: category });
}

/** The same category's thumbs-up/down history across every user -- the "overall" signal. */
export function getOverallCategoryHelpfulness(category: string): Promise<HelpfulnessStats> {
  return computeStats({ commentaryCategory: category });
}

const MIN_SAMPLES_TO_ACT = 3;
const DOWN_RATIO_THRESHOLD = 0.5;

/**
 * Same rule as note-feedback.ts's shouldPreferConciseVariant, applied to
 * per-workout commentary instead of coach notes: once there's enough
 * signal (>=3 votes) that a majority found a workout-type/outcome
 * category's commentary unhelpful -- for this user specifically, or for
 * the user base overall -- future commentary in that category drops the
 * supplementary heart-rate/progress sentences and stays to the point.
 * Individual signal is checked first as the more directly relevant one.
 */
export async function shouldPreferConciseCommentary(userId: string, category: string): Promise<boolean> {
  const individual = await getUserCategoryHelpfulness(userId, category);
  if (individual.total >= MIN_SAMPLES_TO_ACT && (individual.downRatio ?? 0) > DOWN_RATIO_THRESHOLD) {
    return true;
  }

  const overall = await getOverallCategoryHelpfulness(category);
  if (overall.total >= MIN_SAMPLES_TO_ACT && (overall.downRatio ?? 0) > DOWN_RATIO_THRESHOLD) {
    return true;
  }

  return false;
}

/** Records or clears a vote -- submitting the same value again is an "undo" toggle. */
export async function recordCommentaryFeedback(runId: string, helpful: boolean): Promise<boolean | null> {
  const run = await prisma.run.findUnique({ where: { id: runId }, select: { commentaryHelpful: true } });
  const newValue = run?.commentaryHelpful === helpful ? null : helpful;
  await prisma.run.update({ where: { id: runId }, data: { commentaryHelpful: newValue } });
  return newValue;
}
