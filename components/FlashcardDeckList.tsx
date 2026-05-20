import { prisma } from '@/lib/db/prisma';
import { auth } from '@/auth';
import FlashcardDeckCard from './FlashcardDeckCard';

export default async function FlashcardDeckList() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return null;
  }

  // Pobieramy talie fiszek przypisane do zalogowanego użytkownika
  const decks = await prisma.flashcardDeck.findMany({
    where: { userId: session.user.id },
    include: {
      _count: { select: { flashcards: true } }, // Pobieramy ilość fiszek w talii
      file: { select: { title: true } }         // Pobieramy nazwę pliku, z którego pochodzą
    },
    orderBy: { createdAt: 'desc' }
  });

  if (decks.length === 0) {
    return (
      <div className="col-span-full rounded-[2rem] border border-dashed border-slate-300 p-12 text-center bg-white/50 dark:border-slate-700 dark:bg-slate-900/50 shadow-sm">
        <p className="text-slate-600 dark:text-slate-300 font-semibold text-lg">Nie masz jeszcze żadnych talii fiszek.</p>
        <p className="text-sm text-slate-400 mt-1">Wygeneruj je z poziomu podglądu pliku korzystając z AI!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {decks.map((deck) => (
        <FlashcardDeckCard key={deck.id} deck={deck} />
      ))}
    </div>
  );
}