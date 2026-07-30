import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { PlanSetupWizard } from "@/components/plan/PlanSetupWizard";

export default async function NewPlanPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Set up a training plan</h1>
      <PlanSetupWizard />
    </div>
  );
}
