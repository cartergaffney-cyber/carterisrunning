import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const runs = await prisma.run.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
  });

  return NextResponse.json({
    runs: runs.map((run) => ({ ...run, stravaActivityId: run.stravaActivityId.toString() })),
  });
}
