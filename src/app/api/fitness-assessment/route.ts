import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { computeFitnessSnapshot } from "@/lib/fitness-assessment";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snapshot = await computeFitnessSnapshot(user.id);

  return NextResponse.json({
    snapshot: {
      ...snapshot,
      bestRecentEffortDate: snapshot.bestRecentEffortDate?.toISOString() ?? null,
    },
  });
}
