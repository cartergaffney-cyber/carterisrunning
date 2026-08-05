import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { z } from "zod";

// Both fields optional so a caller can change either independently.
const updatePlanSchema = z
  .object({
    status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
    priority: z.enum(["A", "B", "C"]).optional(),
  })
  .refine((v) => v.status !== undefined || v.priority !== undefined, {
    message: "Provide status or priority",
  });

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const plan = await prisma.trainingPlan.findUnique({
    where: { id },
    include: { plannedWorkouts: { orderBy: { date: "asc" } } },
  });

  if (!plan || plan.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ plan });
}

/**
 * Currently only used to archive/reactivate a plan. Plans are never
 * auto-archived on creation -- they stay visible until the user does this
 * explicitly (see the Plans index page's per-tile Archive button).
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const plan = await prisma.trainingPlan.findUnique({ where: { id } });
  if (!plan || plan.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updatePlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.trainingPlan.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ id: updated.id, status: updated.status, priority: updated.priority });
}
