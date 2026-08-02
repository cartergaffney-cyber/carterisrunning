import { NextRequest, NextResponse } from "next/server";
import { syncRunSignupRaces, prunePastSyncedRaces } from "@/lib/race-catalog/runsignup-sync";
import { discoverNewFindARaceEvents } from "@/lib/race-catalog/findarace-sync";
import { enrichRacesMissingWebsite } from "@/lib/race-catalog/enrich-race";
import { addDays, today } from "@/lib/utils/date";

const NEAR_TERM_DAYS = 60;
const WINDOW_DAYS = 365;
const FAR_MONTH_BUFFER_DAYS = 30;

/**
 * Daily rolling-window top-up, not a full monthly reload (see Phase 9 of
 * the plan for why): re-syncing all ~15-20k nationwide races every run
 * would risk serverless timeouts for no real benefit, since most of the
 * 12-month window barely changes day to day. Instead:
 * - every day: refresh the near-term ~2 months, where registration status,
 *   dates, and descriptions actually change.
 * - on the 1st of the month: also pull in the newly-rolled-in far edge of
 *   the 12-month window, so the full window stays populated without ever
 *   re-touching the whole thing.
 * Bounded to a small number of RunSignup pages either way -- comfortably
 * inside default serverless time limits.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = today();

  const nearTerm = await syncRunSignupRaces({ startDate: now, endDate: addDays(now, NEAR_TERM_DAYS) });

  let farMonth: { upserted: number; skippedNoDate: number } | null = null;
  let findARaceDiscovery: Awaited<ReturnType<typeof discoverNewFindARaceEvents>> | null = null;
  let findARaceEnrichment: Awaited<ReturnType<typeof enrichRacesMissingWebsite>> | null = null;

  if (now.getUTCDate() === 1) {
    farMonth = await syncRunSignupRaces({
      startDate: addDays(now, WINDOW_DAYS - FAR_MONTH_BUFFER_DAYS),
      endDate: addDays(now, WINDOW_DAYS),
    });

    // Gap-filling for races that don't use RunSignup -- see findarace-sync.ts
    // for why this source and this cadence/volume. Monthly, not daily: this
    // is meant to catch races the API-driven sync structurally can't see,
    // not to track fast-changing near-term details the way the RunSignup
    // near-term refresh above does.
    findARaceDiscovery = await discoverNewFindARaceEvents();
    findARaceEnrichment = await enrichRacesMissingWebsite();
  }

  const pruned = await prunePastSyncedRaces();

  return NextResponse.json({ nearTerm, farMonth, findARaceDiscovery, findARaceEnrichment, pruned });
}
