import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { recordCommentaryFeedback } from "@/lib/coaching/commentary-feedback";
import { z } from "zod";

const feedbackSchema = z.object({
  helpful: z.boolean(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const helpful = await recordCommentaryFeedback(id, parsed.data.helpful);

  return NextResponse.json({ helpful });
}
