import { auth } from "@/auth";
import { redirect } from "next/navigation";
import SettingsForm from "@/components/settings-form";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(37,99,235,0.06),_transparent_40%),linear-gradient(180deg,_#f8fafc_0%,_#f1f5f9_100%)] font-sans dark:bg-[radial-gradient(circle_at_top_right,_rgba(37,99,235,0.1),_transparent_40%),linear-gradient(180deg,_#0f172a_0%,_#020617_100%)]">
      <SettingsForm user={session.user} />
    </main>
  );
}
