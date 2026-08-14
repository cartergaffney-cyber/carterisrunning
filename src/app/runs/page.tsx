import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { RunLogTable } from "@/components/runs/RunLogTable";
import { StravaSyncButton } from "@/components/strava/StravaSyncButton";

export default async function RunsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const runs = await prisma.run.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-[clamp(26px,4vw,32px)]">Runs</h1>
        <StravaSyncButton />
      </div>
      <RunLogTable runs={runs} />
    </div>
  );
}
