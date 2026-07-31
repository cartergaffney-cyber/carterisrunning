import { prisma } from "@/lib/db";

export interface HelpfulnessStats {
  up: number;
  down: number;
  total: number;
  downRatio: number | null; // null when there's no feedback yet
}

async function computeStats(where: { kind: string; userId?: string }): Promise<HelpfulnessStats> {
  const [up, down] = await Promise.all([
    prisma.coachNote.count({ where: { ...where, helpful: true } }),
    prisma.coachNote.count({ where: { ...where, helpful: false } }),
  ]);
  const total = up + down;
  return { up, down, total, downRatio: total > 0 ? down / total : null };
}

/** This one user's thumbs-up/down history for a given note kind (e.g. "GOAL_UPDATED"). */
export function getUserKindHelpfulness(userId: string, kind: string): Promise<HelpfulnessStats> {
  return computeStats({ userId, kind });
}

/** The same note kind's thumbs-up/down history across every user -- the "overall" signal. */
export function getOverallKindHelpfulness(kind: string): Promise<HelpfulnessStats> {
  return computeStats({ kind });
}

const MIN_SAMPLES_TO_ACT = 3;
const DOWN_RATIO_THRESHOLD = 0.5; // a majority of feedback on this kind said "not helpful"

/**
 * Decides whether this user should get the shorter, more direct phrasing
 * of a given note kind instead of the default. Rule-based, not learned --
 * this coaching system doesn't do ML (see KNOWLEDGE.md), so "using
 * feedback to improve" means a simple, explainable threshold: once there's
 * enough signal (>=3 votes) that a majority found a kind unhelpful, either
 * for this specific user or for the user base as a whole, switch that
 * user to the concise variant. Individual signal is checked first since a
 * user's own reaction is the more direct, relevant one; the overall signal
 * catches cases where a single user hasn't voted enough yet themselves but
 * the wording is already showing a pattern across everyone.
 */
export async function shouldPreferConciseVariant(userId: string, kind: string): Promise<boolean> {
  const individual = await getUserKindHelpfulness(userId, kind);
  if (individual.total >= MIN_SAMPLES_TO_ACT && (individual.downRatio ?? 0) > DOWN_RATIO_THRESHOLD) {
    return true;
  }

  const overall = await getOverallKindHelpfulness(kind);
  if (overall.total >= MIN_SAMPLES_TO_ACT && (overall.downRatio ?? 0) > DOWN_RATIO_THRESHOLD) {
    return true;
  }

  return false;
}

/**
 * Records or clears a vote. Submitting the same value that's already
 * stored clears it (an "undo" toggle) rather than a no-op re-submit --
 * matches the click-to-toggle UI in NoteFeedback.tsx.
 */
export async function recordNoteFeedback(noteId: string, helpful: boolean): Promise<boolean | null> {
  const note = await prisma.coachNote.findUnique({ where: { id: noteId }, select: { helpful: true } });
  const newValue = note?.helpful === helpful ? null : helpful;
  await prisma.coachNote.update({ where: { id: noteId }, data: { helpful: newValue } });
  return newValue;
}
