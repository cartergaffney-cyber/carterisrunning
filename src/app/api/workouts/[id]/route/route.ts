import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { generateGpxForWorkout } from "@/lib/routes/gpx-generator";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const workout = await prisma.plannedWorkout.findUnique({
    where: { id },
    include: { trainingPlan: true },
  });
  if (!workout || workout.trainingPlan.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const route = await generateGpxForWorkout(id);

  return NextResponse.json({
    status: route.status,
    fileName: route.fileName,
    actualDistanceMiles: route.actualDistanceMiles,
    errorMessage: route.errorMessage,
  });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const workout = await prisma.plannedWorkout.findUnique({
    where: { id },
    include: { trainingPlan: true, generatedRoute: true },
  });

  if (!workout || workout.trainingPlan.userId !== user.id || !workout.generatedRoute?.gpxContent) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(workout.generatedRoute.gpxContent, {
    headers: {
      "Content-Type": "application/gpx+xml",
      "Content-Disposition": `attachment; filename="${workout.generatedRoute.fileName ?? "route.gpx"}"`,
    },
  });
}
