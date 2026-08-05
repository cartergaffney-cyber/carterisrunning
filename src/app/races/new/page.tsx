import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { PlanSetupWizard } from "@/components/plan/PlanSetupWizard";

export default async function NewRacePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Add a race</h1>
        <p className="text-sm text-muted-foreground">
          Pick your race and goal — a full training schedule gets built back from race day.
        </p>
      </div>
      <PlanSetupWizard />
    </div>
  );
}
