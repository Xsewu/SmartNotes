import { getFlashcardDeck } from "@/app/actions/flashcards";
import FlashcardPlayer from '@/components/FlashcardPlayer';
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from 'next/navigation';

export default async function FlashcardsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Pobieramy talię (ewentualne błędy wyświetlą się natywnie w Next.js)
  const deck = await getFlashcardDeck(id);

  if (!deck) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 dark:bg-slate-950">
      <div className="max-w-3xl mx-auto">
        <Link href="/dashboard" className="inline-flex items-center gap-2 mb-8 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors dark:text-slate-400 dark:hover:text-slate-100">
          <ArrowLeft className="w-4 h-4" /> Wróć do panelu
        </Link>
        
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-2 dark:text-slate-100">{deck.title}</h1>
        </div>

        <FlashcardPlayer key={deck.id} deckTitle={deck.title} flashcards={deck.flashcards} />
      </div>
    </div>
  );
}