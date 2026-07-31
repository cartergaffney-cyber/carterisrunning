# Coaching knowledge base

Reference notes behind this app's rule-based "AI coach" (`src/lib/coaching/`,
`src/lib/plan-generator/pace-multipliers.ts`, and the plan templates). This
system is deliberately **rule-based, not a physiological model or an LLM** --
every threshold below is a hand-tuned approximation of the research it's
named after, chosen for directional correctness and safety margin, not
precision. Where a number appears in code, it should trace back to a line in
this file. Update this file first when adding or changing a heuristic, then
the code, so the two never drift apart.

## 1. Training intensity distribution (polarized / 80-20)

Stephen Seiler's research on elite endurance athletes' training logs found a
consistent pattern: roughly **80% of training volume at low intensity, ~20%
at high intensity**, with very little time spent in the "grey zone" in
between (moderate/tempo effort that's hard enough to accumulate fatigue but
not hard enough to drive top-end adaptation). Subsequent work (Billat,
Zapico, Esteve-Lanao) corroborated this across running, cycling, and rowing.

Jack Daniels' VDOT system operationalizes this into five named intensities,
each with a %VO2max band:

| Zone | %VO2max | Purpose |
|---|---|---|
| Easy (E) | 65-78% | Aerobic base, recovery, most volume |
| Marathon (M) | 80-84% | Marathon-specific efficiency |
| Threshold (T) | 88-92% | Lactate threshold ("tempo") |
| Interval (I) | 95-100% | VO2max development |
| Repetition (R) | 100%+ | Speed, running economy |

Daniels' recommended split: 70-80% easy, 10-15% marathon+threshold, 10-15%
interval+repetition.

**How this app uses it:**
- `pace-multipliers.ts`'s per-distance-category multiplier tables are this
  app's version of the VDOT zone system (a simpler 5-multiplier
  approximation rather than the full VDOT tables, deliberately -- see that
  file's own docstring).
- `effort-tier.ts`'s HARD/EASY binary split is a compressed version of the
  same idea: instead of grading exactly how hard a session was, it asks the
  one question polarized training actually cares about -- was this a hard
  day or an easy day, and are hard days properly spaced apart. The "grey
  zone" Seiler warns about is exactly what `classifyActualEffortTier`'s
  midpoint-between-easy-and-tempo threshold is trying to catch: pace that's
  faster than a genuine easy day but not a real tempo effort either still
  counts as HARD, because physiologically it's closer to costing you tempo
  fatigue than easy-day recovery.

## 2. Heart rate zones

Karvonen's heart-rate-reserve formula (`target = (HRmax - HRrest) x
%intensity + HRrest`) is the standard way to personalize HR zones, since it
accounts for individual resting HR rather than just %HRmax. Typical five-zone
breakdown by %HRR: Z1 50-60% (recovery), Z2 60-70% (aerobic base/fat
oxidation), Z3 70-80% (aerobic, moderate), Z4 80-90% (threshold), Z5 90-100%
(VO2max).

**Why this app doesn't use fixed HR zones:** doing so correctly requires a
measured or estimated max HR and resting HR, neither of which this app
collects (no user profile field for age, resting HR, or a max-HR test).
Guessing max HR from age (220-age) is a well-known bad estimator with a
+/-10-12 bpm standard deviation -- wrong often enough that grading a run
against it would produce confidently wrong coaching. Instead,
`on-link.ts`'s `computeHeartRateBaseline` compares a run's average HR only
against **that same runner's own recent average HR for the same workout
type** (last 6 runs). This sidesteps the need for a personalized max HR
entirely and is directionally the more useful signal anyway: a lower HR at a
similar pace over time (improving efficiency) is one of the clearest real
markers of aerobic fitness gain, and it's what `recalibrate-plan.ts` could
eventually fold into its "ahead of plan" trend detection (see Section 6).

**Aerobic decoupling (Pw:Hr / Pa:Hr)** is the more rigorous version of this
idea: split a single steady run into two halves, compute pace-to-HR
efficiency factor for each half, and measure the drop. Decoupling above ~5%
signals an aerobic-base or fueling problem; well-trained aerobic systems
show very little drift even on long runs. **Not implemented** here because
it requires per-mile or per-split HR/pace data, which Strava's summary
activity list (what this app syncs) doesn't include -- only Strava's
detailed single-activity endpoint (`GET /activities/{id}`, with a separate
`/streams` call for time series) has that. Flagged as a real future upgrade
if the sync pipeline ever moves to per-activity detail calls.

## 3. Injury risk: what actually predicts it

**The 10% rule is folklore, not research.** It originated from 1980s
coaching intuition and no peer-reviewed trial ever validated 10%
specifically as a threshold. Total weekly mileage change turns out to be a
weak predictor of injury.

**What the evidence actually supports** (Aarhus University / Garmin-RunSafe
Running Health Study, 2025 -- 5,205 runners, 87 countries, 588,071 sessions,
the largest running-injury cohort study to date): running injuries mostly
happen **suddenly, from a single session**, not gradually from cumulative
load. The single strongest predictor found was **how a single run's
distance compared to the runner's own longest run in the trailing 30
days**:

| Single-session spike vs. 30-day longest run | Relative injury risk |
|---|---|
| 10-30% longer | +64% |
| 30-100% longer | +52% |
| 100%+ longer | +128% |

(Risk doesn't increase perfectly monotonically across these bands in the
published figures, but the message is unambiguous: any double-digit-percent
single-session jump past your own recent longest run measurably raises
injury risk, and a session more than double your recent longest is the
worst of all.)

**How this app uses it:** `long-run-spike-risk.ts` computes a runner's
actual trailing-30-day longest completed run and flags any planned or
just-completed long run that exceeds it by more than 30% ("elevated") or
100% ("high"). This is used in two places: `adapt-plan.ts` and
`recalibrate-plan.ts` cap how far a long run's target can grow even when a
runner is "ahead of plan," and `commentary.ts` calls it out by name when a
completed long run was itself a big spike, since that's the single highest-
value, most specific, most recently-validated warning this system can give.

**Acute:chronic workload ratio (ACWR)** (Tim Gabbett): the older, more
widely-cited workload-injury framework -- ratio of the last 7 days' load to
the last 28 days' average weekly load. Sweet spot ~0.8-1.3, danger zone
above ~1.5, with 2x-4x injury risk reported above a ratio of 2. Interesting
historical context, and still a reasonable coarse signal, but the 2025
Aarhus study specifically found ACWR and week-to-week mileage change had
"little to no predictive value" once single-session spike was accounted
for -- so this app deliberately leans on the single-session metric instead
of building a parallel ACWR system that the more recent, larger, more
running-specific study suggests is less informative.

**What is well evidenced for injury prevention:** strength training (~50%
reduction in overuse injury in meta-analysis) and a 5-10% cadence increase
(16-34% reduction in knee joint loading, no pace cost). Neither is
implemented here -- strength work isn't tracked by this app at all (no
strength-specific workout type or logging), and cadence isn't available from
Strava's summary activity payload this app syncs. Both are noted as
plausible future features, not silently assumed.

## 4. Overreaching vs. overtraining syndrome

**Functional overreaching**: the planned, temporary fatigue that follows a
hard training block, fully resolved within days by an easy day or two --
this is the entire point of progressive overload and isn't a problem.

**Non-functional overreaching (NFOR)**: the same symptoms (heavy legs,
workouts feeling harder than the prescribed pace/effort should, incomplete
recovery between sessions, whole-day fatigue not just post-run, persistent
soreness, mood dips) but taking **weeks** rather than days to resolve. The
distinguishing signal isn't the symptom, it's the recovery time.

**Overtraining syndrome (OTS)**: a much rarer, serious state -- paradoxical
performance loss despite continued or increased training, plus systemic
effects (mood, sleep, hormonal, sometimes cardiac). Recovery is measured in
months, occasionally longer.

**How this app uses it:** `effort-tier.ts` and `compare-run.ts`'s
TOO_HARD/repeated-hard-day detection is this app's proxy for catching the
*conditions that lead to* NFOR (stacking hard days, running easy days too
hard) before it happens -- this app has no way to detect NFOR/OTS directly
(that requires longitudinal performance-decline and mood/sleep data this app
doesn't collect), so the entire strategy is prevention via hard/easy
spacing rather than detection after the fact.

## 5. Cutback ("step-back") weeks

Standard practice: reduce volume and/or intensity roughly every 3-4 weeks of
progressive overload, grounded in the supercompensation model (fatigue +
recovery => adaptation above the prior baseline; skip the recovery half and
the adaptation doesn't fully arrive). Fitness isn't meaningfully lost over a
single down week -- measurable detraining takes roughly two weeks of near-
total inactivity, far more than one lighter week.

**How this app uses it:** already the plan generator's `stepBackCadence`
and `stepBackReductionPct` per template (every 4th week for
SHORT/HALF/MARATHON, every 3rd for ULTRA/HUNDRED, ~20-25% reduction) --
this section documents the existing choice's grounding, no code change.

## 6. Taper

Meta-analytic consensus (Bosquet et al.): a **2-week taper with a 41-60%
total volume reduction** produces the best race-day performance across
endurance sports, worth roughly 2-6% performance improvement. Typical
progressive shape: ~20-25% volume cut the first taper week, 40-50% the
second, 60-70% in the final days -- a gradual step down, not a cliff.
Critically, **intensity is preserved even as volume drops** (short
race-pace-effort touches stay in the plan); cutting intensity too is a
common taper mistake that leaves athletes flat rather than sharp.

**How this app uses it:** the plan generator's `taperPct` curve per template
already encodes a progressive volume reduction into taper weeks. This
knowledge pass adds phase-aware coaching commentary (`commentary.ts`) so a
short or easy day during a TAPER-phase week is framed as "correct and
intentional" rather than "a shortfall," since the comparison logic grades
against that week's already-reduced target -- the phase-aware copy exists so
the *tone* matches the science, not just the number.

## 7. Race-day fuel

**Marathon and up:** glycogen stores support roughly 90-120 minutes of
running at marathon effort before depletion becomes the limiting factor --
modeling (Rapoport, Harvard, published in PLOS Comp Bio) puts the classic
"mile 20-21 wall" exactly where stored glycogen runs out for runners racing
at 80-95% of aerobic capacity. Current fueling guidance has moved
meaningfully upward from the old "30-60g carbs/hour" advice: **60-90g/hour**
is now a mainstream recreational target (40-60g/hour for less
gut-trained runners, up to 90-120g/hour for well gut-trained faster
runners), always rehearsed in training long runs first, never introduced on
race day.

**Ultra-distance:** the same fueling-early-and-often principle applies, at
lower per-hour intensity but over much longer duration, plus terrain-specific
tactics this app's ultra/hundred templates already assume: power-hiking
steep climbs is frequently faster and cheaper (fatigue-wise) than trying to
run them, and gut tolerance itself is trainable -- rehearsing race-day fuel,
heat, and terrain conditions in long runs reduces race-day GI distress.

**How this app uses it:** informs the *tone and content* of
`LONG_RUN`/`BACK_TO_BACK_LONG`/`RACE`-related commentary (treating the long
run as fuel-strategy rehearsal, not just miles), and is a natural future
extension point if this app ever adds a fueling-reminder feature ahead of
long runs -- not built now, no data model for it yet.

## 8. Illness

"Neck check" heuristic: above-the-neck symptoms only (runny nose, sore
throat, congestion) -- generally fine to keep running easy if it feels
okay. Below-the-neck or systemic symptoms (fever, body aches, elevated
resting HR) -- stop training entirely until symptom-free for 24 hours, then
return easy and short for at least 3 days before reintroducing intensity.
Rule of thumb for rebuilding: roughly one to two easy days for every day
missed before returning to pre-illness training levels.

**Not implemented:** this app has no illness/symptom input from the user at
all, so there's nothing to trigger this logic from. Documented here as a
plausible future feature (a simple "I'm sick" button that pauses/softens the
plan for N days using this rule) rather than guessed at silently.

## Sources

- [Complete Guide to Polarized Training with Dr. Stephen Seiler](https://www.fasttalklabs.com/pathways/polarized-training/)
- [Five training tips from the man who created the 80/20 rule](https://athleticsweekly.com/news/opinion/five-training-tips-stephen-seiler-80-20-rule-46788/)
- [VDOT Training Tables & How to Use Them](https://rundna.com/resources/run-training/vdot-training-tables-how-to-use-them/)
- [Jack Daniels' Running Formula](https://fellrnr.com/wiki/Jack_Daniels)
- [How much running is too much? Identifying high-risk running sessions in a 5200-person cohort study (Aarhus University)](https://pure.au.dk/portal/en/publications/how-much-running-is-too-much-identifying-high-risk-running-sessio/)
- [Everything we thought about running injury development was wrong, study shows](https://health.au.dk/en/display/artikel/everything-we-thought-about-running-injury-development-was-wrong-study-shows)
- [The Myth of the 10 Percent Rule](https://www.outsideonline.com/running/training/running-101/myth-of-the-10-percent-rule/)
- [Training Ground Guru | Tim Gabbett's guide to acute-chronic load](http://archive.trainingground.guru/articles/loaded-questions-with-tim-gabbett)
- [The Relationship Between Acute:Chronic Workload Ratios and Injury Risk](https://www.dovepress.com/the-relationship-between-acute-chronic-workload-ratios-and-injury-risk-peer-reviewed-fulltext-article-OAJSM)
- [Aerobic Decoupling: Ultimate Heart Rate Drift Guide](https://www.trainingpeaks.com/coach-blog/aerobic-endurance-and-decoupling/)
- [Aerobic Decoupling (Pw:Hr and Pa:HR) and Efficiency Factor (EF)](https://help.trainingpeaks.com/hc/en-us/articles/204071724-Aerobic-Decoupling-Pw-Hr-and-Pa-HR-and-Efficiency-Factor-EF)
- [Heart Rate Zones Calculator (Karvonen)](https://www.openathlete.org/tools/heart-rate-zones)
- [Overreaching vs Overtraining in Runners](https://relentlessforwardcommotion.com/overreaching-overtraining-in-runners/)
- [Functional and Nonfunctional Overreaching and Overtraining (NSCA)](https://www.nsca.com/education/articles/kinetic-select/functional-and-nonfunctional-overreaching-and-overtraining/)
- [Longer Disciplined Tapers Improve Marathon Performance for Recreational Runners](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8506252/)
- [Marathon Taper: Week-by-Week Schedule, Percentages, and Protocols](https://runnersconnect.net/how-to-taper-for-a-marathon/)
- [Metabolic Factors Limiting Performance in Marathon Runners (PLOS Comp Bio)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2958805/)
- [The New Guidelines of How to Fuel a Half Marathon](https://lauranorrisrunning.substack.com/p/the-new-guidelines-of-how-to-fuel)
- [How to Fuel and Hydrate for an Ultramarathon?](https://run247.com/guides/fuel-hydrate-ultramarathon)
- [Session RPE / Borg CR-10 scale validity for training load](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4332174/)
- [How to Return to Running after the Flu or a Fever](https://runnersconnect.net/how-to-return-to-running-after-the-flu-or-a-fever/)
- [The Art of the Cutback Week: How Rest Fuels Progress](https://medium.com/scripting-horizons/the-art-of-the-cutback-week-how-rest-fuels-progress-b172852304ea)
