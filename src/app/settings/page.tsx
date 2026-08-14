import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { AddressForm } from "@/components/settings/AddressForm";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-8">
      <h1 className="text-[clamp(26px,4vw,32px)]">Settings</h1>
      <AddressForm currentAddress={user.homeAddress} />
    </div>
  );
}
