import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateGpxForWorkout } from "@/lib/routes/gpx-generator";
import { addDays, today } from "@/lib/utils/date";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tomorrow = addDays(today(), 1);
  const dayAfterTomorrow = addDays(tomorrow, 1);

  const workouts = await prisma.plannedWorkout.findMany({
    where: {
      workoutType: { in: ["LONG_RUN", "BACK_TO_BACK_LONG"] },
      date: { gte: tomorrow, lt: dayAfterTomorrow },
      trainingPlan: { status: "ACTIVE" },
    },
  });

  const results = await Promise.all(workouts.map((workout) => generateGpxForWorkout(workout.id)));

  return NextResponse.json({
    generated: results.length,
    ready: results.filter((r) => r.status === "READY").length,
    failed: results.filter((r) => r.status === "FAILED").length,
  });
}
