import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clubs = await prisma.club.findMany({
    where: { userId: user.id },
    include: { sessions: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ clubs });
}
