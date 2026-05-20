"use client";

import { Layers, FileText, CalendarDays, Edit2, Check, X, Trash2, Clock } from 'lucide-react';
import { useState, useTransition } from 'react';
import { updateFlashcardDeckTitle, deleteFlashcardDeck } from '@/app/actions/flashcards';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { Prisma } from '@prisma/client';

type FlashcardDeckCardDeck = Prisma.FlashcardDeckGetPayload<{
  include: {
    _count: { select: { flashcards: true } };
    file: { select: { title: true } };
  };
}>;

export default function FlashcardDeckCard({ deck }: { deck: FlashcardDeckCardDeck }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(deck.title);
  const [isPending, startTransition] = useTransition();

  const handleSave = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!title.trim()) return;
    
    startTransition(async () => {
      try {
        await updateFlashcardDeckTitle(deck.id, title);
        toast.success("Tytuł talii został zaktualizowany.");
        setIsEditing(false);
        router.refresh();
      } catch {
        toast.error("Wystąpił błąd podczas zapisywania.");
      }
    });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Czy na pewno chcesz trwale usunąć tę talię fiszek?")) return;
    
    startTransition(async () => {
      try {
        await deleteFlashcardDeck(deck.id);
        toast.success("Talia została usunięta.");
        router.refresh();
      } catch {
        toast.error("Wystąpił błąd podczas usuwania.");
      }
    });
  };

  const handleCancel = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTitle(deck.title);
    setIsEditing(false);
  };

  return (
    <div 
      onClick={() => { if (!isEditing) router.push(`/flashcards/${deck.id}`); }}
      className="group relative flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-blue-300 hover:ring-1 hover:ring-blue-100 hover:shadow-lg cursor-pointer dark:border-slate-700/60 dark:bg-slate-800/40 dark:hover:border-blue-500/50 dark:hover:bg-slate-800/60"
    >
      
      {/* Przyciski Akcji (Pokazują się po najechaniu) */}
      <div className="absolute right-4 top-4 z-20 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {!isEditing && (
          <>
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsEditing(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors dark:hover:bg-slate-700/50">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={handleDelete} disabled={isPending} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors dark:hover:bg-slate-700/50">
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      <div className="relative z-10 flex flex-1 flex-col">
        <div className="flex items-start justify-between mb-4">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors dark:bg-slate-800 dark:text-blue-400 dark:group-hover:bg-blue-600 dark:group-hover:text-white">
            <Layers className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full flex items-center gap-1.5 dark:bg-slate-800 dark:text-slate-300">
            {deck._count.flashcards} kart
          </span>
        </div>
        
        {isEditing ? (
          <div className="mb-2 flex items-center gap-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
            <input 
              autoFocus
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave(e);
                if (e.key === "Escape") handleCancel(e);
              }}
              className="flex-1 w-full rounded-lg border border-blue-300 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 dark:bg-slate-950 dark:border-blue-500/50 dark:text-white"
            />
            <button onClick={handleSave} disabled={isPending} className="p-2 text-green-600 hover:bg-green-50 rounded-md transition-colors dark:hover:bg-green-900/20">
              {isPending ? <Clock className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </button>
            <button onClick={handleCancel} disabled={isPending} className="p-2 text-slate-400 hover:bg-slate-100 rounded-md transition-colors dark:hover:bg-slate-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <h3 className="font-semibold text-slate-800 text-lg mb-2 line-clamp-2 leading-tight pr-16 dark:text-slate-100">
            {deck.title}
          </h3>
        )}
        
        <div className="mt-auto pt-4 space-y-2">
          <div className="flex items-center text-xs text-slate-500 gap-2 dark:text-slate-400">
            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">Z pliku: {deck.file.title}</span>
          </div>
          <div className="flex items-center text-xs text-slate-500 gap-2 dark:text-slate-400">
            <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{new Date(deck.createdAt).toLocaleDateString('pl-PL')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}