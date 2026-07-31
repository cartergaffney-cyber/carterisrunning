import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { runCoachingPipeline } from "@/lib/coaching/on-link";

const patchRunSchema = z.object({
  plannedWorkoutId: z.string().nullable(),
});

function serializeRun<T extends { stravaActivityId: bigint }>(run: T) {
  return { ...run, stravaActivityId: run.stravaActivityId.toString() };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const run = await prisma.run.findUnique({ where: { id } });

  if (!run || run.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ run: serializeRun(run) });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const run = await prisma.run.findUnique({ where: { id } });
  if (!run || run.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = patchRunSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { plannedWorkoutId } = parsed.data;

  if (plannedWorkoutId) {
    const workout = await prisma.plannedWorkout.findUnique({
      where: { id: plannedWorkoutId },
      include: { trainingPlan: true },
    });
    if (!workout || workout.trainingPlan.userId !== user.id) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (run.plannedWorkoutId && run.plannedWorkoutId !== plannedWorkoutId) {
        await tx.plannedWorkout.update({
          where: { id: run.plannedWorkoutId },
          data: { completed: false },
        });
      }

      await tx.run.update({ where: { id }, data: { plannedWorkoutId } });

      if (plannedWorkoutId) {
        await tx.plannedWorkout.update({
          where: { id: plannedWorkoutId },
          data: { completed: true },
        });
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "That workout is already linked to a different run." },
        { status: 409 }
      );
    }
    throw error;
  }

  if (plannedWorkoutId) {
    await runCoachingPipeline(id, plannedWorkoutId);
  }

  const updated = await prisma.run.findUniqueOrThrow({ where: { id } });
  return NextResponse.json({ run: serializeRun(updated) });
}
