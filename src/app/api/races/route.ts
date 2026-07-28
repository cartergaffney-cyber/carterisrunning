import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { createRaceSchema } from "@/lib/validation/schemas";
import { parseLocalDate } from "@/lib/utils/date";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createRaceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { raceDate, ...rest } = parsed.data;

  const race = await prisma.race.create({
    data: {
      ...rest,
      raceDate: raceDate ? parseLocalDate(raceDate) : undefined,
      confirmedByUser: true,
    },
  });

  return NextResponse.json({ id: race.id }, { status: 201 });
}
