import StudentNotesDashboard from "@/components/student-notes-dashboard";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return <StudentNotesDashboard user={session.user} />;
}
