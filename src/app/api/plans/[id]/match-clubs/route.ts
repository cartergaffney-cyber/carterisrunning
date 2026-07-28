import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { matchWorkoutsToClubSessions } from "@/lib/clubs/matching";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const plan = await prisma.trainingPlan.findUnique({ where: { id } });
  if (!plan || plan.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const matchedCount = await matchWorkoutsToClubSessions(id);

  return NextResponse.json({ matched: matchedCount });
}
