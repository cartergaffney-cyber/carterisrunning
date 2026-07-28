import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { z } from "zod";

const patchClubSchema = z.object({
  status: z.enum(["CANDIDATE", "TRACKED", "DISMISSED"]).optional(),
  notes: z.string().max(2000).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  const parsed = patchClubSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.club.update({
    where: { id },
    data: parsed.data,
    include: { sessions: true },
  });

  return NextResponse.json({ club: updated });
}
