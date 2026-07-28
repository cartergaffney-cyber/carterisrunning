import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { z } from "zod";

const patchSessionSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  startTime: z.string().max(5).optional(),
  type: z.enum(["EASY", "TEMPO", "INTERVAL", "LONG_RUN", "SOCIAL", "TRACK", "UNKNOWN"]).optional(),
  distanceMiles: z.number().positive().optional(),
  meetingLocation: z.string().max(300).optional(),
  isConfirmed: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, sessionId } = await params;
  const session = await prisma.clubSession.findUnique({
    where: { id: sessionId },
    include: { club: true },
  });
  if (!session || session.clubId !== id || session.club.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = patchSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.clubSession.update({
    where: { id: sessionId },
    data: parsed.data,
  });

  return NextResponse.json({ session: updated });
}
