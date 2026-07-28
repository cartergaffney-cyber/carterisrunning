import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createSessionSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().max(5).optional(),
  type: z.enum(["EASY", "TEMPO", "INTERVAL", "LONG_RUN", "SOCIAL", "TRACK", "UNKNOWN"]).default("UNKNOWN"),
  distanceMiles: z.number().positive().optional(),
  meetingLocation: z.string().max(300).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const club = await prisma.club.findUnique({ where: { id } });
  if (!club || club.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = createSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const session = await prisma.clubSession.create({
    data: { ...parsed.data, clubId: id, isConfirmed: true },
  });

  return NextResponse.json({ session }, { status: 201 });
}
