import { formatPaceSecondsPerMile } from "@/lib/utils/pace";
import type { TrainingPhase, WorkoutType } from "@/lib/plan-generator/types";
import type { ComparisonStatus, RunComparison } from "./types";
import type { SpikeRiskLevel } from "./long-run-spike-risk";

export interface CommentaryAdaptation {
  triggerSummary: string;
}

export interface CoachCommentaryInput {
  workoutType: WorkoutType;
  phase?: TrainingPhase | null;
  comparison: RunComparison | null;
  run: {
    distanceMiles: number;
    durationSeconds: number;
    avgPaceSecondsPerMile: number;
    avgHeartRate?: number | null;
  };
  /** Runner's own recent average HR for this same workout type, for a personalized comparison rather than a generic BPM threshold. */
  heartRateBaselineBpm?: number | null;
  /** Days until race day, for a "progress toward the goal" closing note. */
  daysToRace?: number | null;
  /** Single-session distance spike vs. the runner's own trailing 30-day longest run -- see KNOWLEDGE.md Section 3. */
  spikeRisk?: { level: SpikeRiskLevel; ratio: number } | null;
  /** Any stable per-run identifier, used only to deterministically pick among phrase variants so commentary doesn't read identically run after run. */
  varietySeed?: string;
  adaptation: CommentaryAdaptation | null;
}

/**
 * Produces the "coach's note" shown on a completed run -- always present,
 * never empty, whether the run was too hard, too easy, or right on target.
 * Deliberately isolated behind this one function -- today it's rule-based
 * template assembly (instant, free, deterministic, consistent with the rest
 * of the app's heuristic "smart" features: pace zones, fitness assessment,
 * club matching), but callers only see a string in, string out. Swapping the
 * internals for a real generative call later (e.g. the Claude API) is a
 * contained change that doesn't touch any call site. Every threshold and
 * piece of framing here traces back to a cited source in
 * src/lib/coaching/KNOWLEDGE.md.
 */
export function generateCoachCommentary(input: CoachCommentaryInput): string {
  const sentences = [
    comparisonSentence(input),
    effectSentence(input),
    spikeRiskSentence(input),
    heartRateSentence(input),
    progressSentence(input.daysToRace),
  ];
  if (input.adaptation) {
    sentences.push(input.adaptation.triggerSummary);
  }
  return sentences.filter(Boolean).join(" ");
}

function comparisonSentence({ comparison, run }: CoachCommentaryInput): string {
  if (!comparison) {
    return `Logged: ${run.distanceMiles.toFixed(1)} mi at ${formatPaceSecondsPerMile(run.avgPaceSecondsPerMile)}.`;
  }

  const roundedPaceDelta =
    comparison.paceDeltaSecondsPerMile != null ? Math.round(comparison.paceDeltaSecondsPerMile) : null;
  const paceNote =
    roundedPaceDelta != null && roundedPaceDelta !== 0
      ? `${Math.abs(roundedPaceDelta)} sec/mi ${roundedPaceDelta < 0 ? "faster" : "slower"} than planned`
      : null;
  const volumeRatio = comparison.durationRatio ?? comparison.distanceRatio;
  const roundedVolumePct = volumeRatio != null ? Math.round(Math.abs(volumeRatio - 1) * 100) : null;
  const volumeNote =
    roundedVolumePct != null && roundedVolumePct !== 0
      ? `${roundedVolumePct}% ${volumeRatio! > 1 ? "longer" : "shorter"} than planned`
      : null;

  const parts = [`${run.distanceMiles.toFixed(1)} mi at ${formatPaceSecondsPerMile(run.avgPaceSecondsPerMile)}`];
  if (paceNote) parts.push(paceNote);
  if (volumeNote) parts.push(volumeNote);

  return `${parts.join(" — ")}.`;
}

/**
 * Simple deterministic string hash, used only to pick a phrase variant --
 * not for anything security-sensitive. Multiplying by an odd constant never
 * changes a running accumulator's parity, so the raw hash's low bit is just
 * the XOR of the input's character-code parities -- degenerate for
 * mod-2 bucketing. Shifting off a few low bits before taking the modulus
 * pulls from bits that were actually mixed by the multiplication's carries.
 */
function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash >>> 4);
}

function pickVariant(variants: string[], seed: string | undefined): string {
  if (variants.length === 1 || !seed) return variants[0];
  return variants[hashString(seed) % variants.length];
}

type EffectBank = Partial<Record<WorkoutType, Record<ComparisonStatus, string[]>>>;

// Per (workout type, status), 2+ phrase variants -- picked deterministically
// per run (see pickVariant) so the same run always reads the same way, but
// different runs don't all sound identically robotic. Content grounded in
// KNOWLEDGE.md Section 1 (polarized training / hard-easy spacing) unless
// noted otherwise.
const EFFECT_SENTENCES: EffectBank = {
  EASY: {
    ON_TARGET: [
      "Textbook easy day — exactly the low-stress aerobic volume this slot is for, banking fitness without adding fatigue.",
      "This is what easy is supposed to feel like — comfortably under control, building your aerobic base without touching the recovery you'll need later this week.",
    ],
    TOO_HARD: [
      "Running an easy day this hard blurs the line between easy and hard. It blunts the recovery this day is meant to provide, and done repeatedly is one of the most common ways runners plateau or get hurt.",
      "This crept out of easy territory. The research on polarized training is pretty blunt about this: easy days that aren't actually easy are the single most common way recreational runners quietly overtrain.",
    ],
    TOO_EASY: [
      "Nothing wrong with an easy day this light, though if it was cut short rather than deliberately easy, there's a little aerobic volume left on the table.",
      "Plenty easy — good if that was the intent. If it was a shortened day rather than a deliberately light one, no harm done, just a bit less volume banked.",
    ],
  },
  TEMPO: {
    ON_TARGET: [
      "Right in the zone — sustained effort at this intensity is what pushes your lactate threshold, letting you hold faster paces before fatigue piles up.",
      "That's textbook threshold work — comfortably hard, sustainable, exactly where lactate-threshold adaptation happens.",
    ],
    TOO_HARD: [
      "You pushed noticeably harder than the tempo effort called for. That can still build fitness, but it eats into the recovery you'll need for the rest of the week.",
      "That ran hotter than a tempo effort should. Fine once in a while, but threshold work loses value once it edges into all-out territory — it starts costing more recovery than it's worth.",
    ],
    TOO_EASY: [
      "This landed closer to a moderate effort than a true tempo. You'll still get some benefit, but the lactate-threshold stimulus this session is built around was mostly missed.",
      "That was more of a steady cruise than a real tempo push — comfortable, but under the intensity this session needs to move your threshold.",
    ],
  },
  INTERVAL: {
    ON_TARGET: [
      "Sharp, controlled speed work — exactly the stimulus that raises VO2 max and running economy.",
      "Crisp and well-paced — this is the top-end work that raises your ceiling, not just your floor.",
    ],
    TOO_HARD: [
      "You ran this notably harder than prescribed. Occasionally that's fine, but interval sessions run too hot too often lead to burnt-out legs rather than faster ones.",
      "That was faster than called for. VO2max work is effective in a fairly narrow band — beyond it you're mostly accumulating fatigue without a proportional fitness return.",
    ],
    TOO_EASY: [
      "This came in slower than the interval work called for — useful turnover practice, but not the top-end stimulus this session is designed to build.",
      "That stayed under the target intensity — still useful leg-speed work, just short of the VO2max stimulus this session is built to deliver.",
    ],
  },
  RACE_PACE: {
    ON_TARGET: [
      "Dialed-in race-effort practice — exactly how your legs and mind rehearse what race day will feel like.",
      "Right on goal pace — this is the specific rehearsal that makes race day feel familiar instead of unknown.",
    ],
    TOO_HARD: [
      'You ran faster than goal race pace here. Encouraging fitness-wise, but be careful not to let every "race pace" session creep into an all-out effort — save some of that for race day.',
      "That beat goal pace. Good sign for fitness, just make sure it was controlled effort and not a hidden time trial — race-pace days work best rehearsed, not raced.",
    ],
    TOO_EASY: [
      "This came in slower than goal race pace, so the specific rehearsal value was limited — still useful aerobic work, just not race-pace practice.",
      "That ran slower than goal pace, so today didn't quite deliver the race-specific rehearsal this session is for — still fine as aerobic volume.",
    ],
  },
  LONG_RUN: {
    ON_TARGET: [
      "Right where the plan wants you — time-on-feet like this builds the durability and fat-burning efficiency that carries you through race day.",
      "Solid long run, right on target. This is the session that builds the aerobic durability that shorter runs simply can't replicate.",
    ],
    TOO_HARD: [
      "This long run ran hotter and/or longer than planned. Long runs are where overreaching sneaks up on people — the fitness benefit is real, but so is the extra recovery cost, so treat the next day or two gently.",
      "That was a bigger long run than planned, in pace or distance. The fitness benefit is real, but long runs are exactly where non-functional overreaching starts if it isn't followed by real recovery.",
    ],
    TOO_EASY: [
      "This came in shorter or easier than the long run called for. That's a lower-risk miss than most — better to under-do a long run than force it — but this week's endurance stimulus was only partially delivered.",
      "Shorter or easier than planned. Of all the ways a session can miss its target, this is the safest one — under-doing a long run beats forcing it, even if this week's aerobic stimulus was only partial.",
    ],
  },
  BACK_TO_BACK_LONG: {
    ON_TARGET: [
      "Solid back-to-back effort — stacking time-on-feet on tired legs like this builds the fatigue-resistance ultra racing demands.",
      "Right on target for a back-to-back day — this is the specific adaptation (running well on already-tired legs) that ultra distances actually test.",
    ],
    TOO_HARD: [
      "This back-to-back session ran harder or longer than planned, which is a meaningful fatigue load on top of an already demanding weekend structure. Recovery over the next day or two matters more than usual.",
      "That ran bigger than planned on top of an already tiring weekend structure. Worth being deliberate about recovery the next couple of days — this is a lot of accumulated load at once.",
    ],
    TOO_EASY: [
      "This came in under the planned back-to-back effort. No harm done, but the accumulated-fatigue stimulus this weekend structure is built around was only partially delivered.",
      "Lighter than planned for a back-to-back day. Totally fine occasionally — just know the tired-legs stimulus this structure is built around wasn't fully delivered this time.",
    ],
  },
};

const NO_COMPARISON_SENTENCES: Partial<Record<WorkoutType, string>> = {
  RACE: "Race day is the payoff for the whole training block, however it went. Give yourself real recovery before starting the next cycle.",
  CROSS_TRAIN: "Cross-training logged — good supplemental work that builds fitness without adding running-specific pounding.",
  REST: "Rest, logged as an active recovery jog instead — light activity on a scheduled rest day is generally fine as long as it stays easy.",
};

// During a taper, a short or easy day isn't a shortfall -- it's the plan
// working as intended. See KNOWLEDGE.md Section 6: a 2-week, 41-60% volume
// reduction is the evidence-backed shape of a taper, and treating a light
// taper day as a miss would actively work against what the science says to
// do here.
const TAPER_TOO_EASY_OVERRIDE: Partial<Record<WorkoutType, string>> = {
  EASY: "This is exactly what taper is supposed to feel like — lighter, fresher legs, banking readiness rather than fitness at this point.",
  LONG_RUN:
    "A shorter long run right now is correct, not a miss — taper research consistently shows cutting volume 40-60% in the final two weeks while staying fresh outperforms holding peak mileage into race week.",
  TEMPO:
    "A lighter tempo effort fits taper perfectly — the goal now is staying sharp on less volume, not chasing more threshold work.",
  RACE_PACE:
    "Easing off race pace touches during taper is fine — the point now is a light reminder of the rhythm, not another hard rehearsal.",
  INTERVAL: "Dialed-back intervals are normal in taper — short, controlled reminders of top-end speed without digging a fatigue hole before race day.",
};

function effectSentence(input: CoachCommentaryInput): string {
  if (!input.comparison) {
    return NO_COMPARISON_SENTENCES[input.workoutType] ?? "Logged and linked to your plan.";
  }

  if (input.phase === "TAPER" && input.comparison.status === "TOO_EASY") {
    const override = TAPER_TOO_EASY_OVERRIDE[input.workoutType];
    if (override) return override;
  }

  const variants = EFFECT_SENTENCES[input.workoutType]?.[input.comparison.status];
  if (!variants) return "Logged and linked to your plan — keep stacking consistent weeks like this.";
  return pickVariant(variants, input.varietySeed);
}

// See KNOWLEDGE.md Section 3: single-session distance spikes vs. a runner's
// own trailing 30-day longest run are the best-evidenced predictor of
// sudden-onset running injury found to date -- specifically called out here
// rather than folded into the generic TOO_HARD language, since it's backed
// by a much larger, more specific, more recent study than the general
// "ran too hard" framing above.
function spikeRiskSentence({ spikeRisk, workoutType }: CoachCommentaryInput): string | null {
  if (!spikeRisk || spikeRisk.level === "NONE") return null;
  if (workoutType !== "LONG_RUN" && workoutType !== "BACK_TO_BACK_LONG") return null;

  const pct = Math.round((spikeRisk.ratio - 1) * 100);
  if (spikeRisk.level === "HIGH") {
    return `Worth flagging: this was ${pct}% longer than your longest run in the past 30 days. Single-session jumps that large are linked to a meaningfully higher injury risk in the days that follow — prioritize easy running and recovery this week.`;
  }
  return `One more note: this was ${pct}% longer than your longest run in the past 30 days. That's enough of a jump that it's worth backing off intensity for a few days and paying attention to how your legs feel.`;
}

// Absolute heart rate varies hugely person to person, so this is never
// graded against a fixed BPM threshold -- only against the runner's own
// recent average for the same workout type. A lower HR at a similar pace
// over time is one of the clearest real signals of improving aerobic
// fitness; a higher one can flag heat, dehydration, or accumulated fatigue.
// See KNOWLEDGE.md Section 2 for why this app doesn't use fixed HR zones.
const HEART_RATE_BASELINE_TOLERANCE_BPM = 4;

function heartRateSentence({ run, heartRateBaselineBpm }: CoachCommentaryInput): string | null {
  if (run.avgHeartRate == null) return null;

  if (heartRateBaselineBpm == null) {
    return `Average heart rate was ${run.avgHeartRate} bpm.`;
  }

  const diff = run.avgHeartRate - heartRateBaselineBpm;
  if (Math.abs(diff) <= HEART_RATE_BASELINE_TOLERANCE_BPM) {
    return `Average heart rate was ${run.avgHeartRate} bpm — right in line with your recent runs like this.`;
  }
  if (diff > 0) {
    return `Average heart rate was ${run.avgHeartRate} bpm, ${Math.round(diff)} bpm higher than your recent average of ${Math.round(
      heartRateBaselineBpm
    )} for runs like this — could be extra effort, heat, or accumulated fatigue worth keeping an eye on.`;
  }
  return `Average heart rate was ${run.avgHeartRate} bpm, ${Math.round(Math.abs(diff))} bpm lower than your recent average of ${Math.round(
    heartRateBaselineBpm
  )} for runs like this — a good sign your aerobic efficiency is improving.`;
}

function progressSentence(daysToRace: number | null | undefined): string | null {
  if (daysToRace == null || daysToRace <= 0) return null;

  const weeks = Math.round(daysToRace / 7);
  if (weeks <= 1) {
    return "Race day is just about here — trust the work you've put in.";
  }
  if (weeks <= 3) {
    return `With about ${weeks} week${weeks === 1 ? "" : "s"} to go, you're deep into the sharpening phase now.`;
  }
  return `${weeks} weeks out from race day — keep stacking sessions like this and the fitness will be there when it counts.`;
}
