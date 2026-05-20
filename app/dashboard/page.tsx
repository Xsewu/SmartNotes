import StudentNotesDashboard from "@/components/student-notes-dashboard";
import { auth } from "@/auth";
import FlashcardDeckList from "@/components/FlashcardDeckList";

export default async function DashboardPage() {
  const session = await auth();

  return <StudentNotesDashboard user={session?.user} flashcardsList={<FlashcardDeckList />} />;
}
