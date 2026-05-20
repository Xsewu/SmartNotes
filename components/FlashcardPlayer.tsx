'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, RotateCcw, CheckCircle2 } from 'lucide-react';

type Flashcard = {
  id: string;
  front: string;
  back: string;
};

export default function FlashcardPlayer({ deckTitle, flashcards }: { deckTitle: string, flashcards: Flashcard[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  if (!flashcards || flashcards.length === 0) {
    return <div className="text-center p-10 text-slate-500">Brak fiszek w tej talii.</div>;
  }

  const currentCard = flashcards[currentIndex];
  const progress = ((currentIndex + 1) / flashcards.length) * 100;
  const isFinished = currentIndex === flashcards.length - 1 && isFlipped;

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setIsFlipped(false);
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
      // Czekamy chwilę, aby karta odwróciła się przed zmianą tekstu
      transitionTimerRef.current = setTimeout(() => setCurrentIndex((prev) => prev + 1), 150);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
      transitionTimerRef.current = setTimeout(() => setCurrentIndex((prev) => prev - 1), 150);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4 flex flex-col items-center">
      {/* Nagłówek i pasek postępu */}
      <div className="w-full mb-8">
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-4">{deckTitle}</h2>
        <div className="flex justify-between text-sm text-slate-500 mb-2 font-medium">
          <span>Karta {currentIndex + 1} z {flashcards.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-blue-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Przestrzeń 3D dla karty */}
      <div 
        className="relative w-full aspect-video md:aspect-[2/1] cursor-pointer [perspective:1000px] group"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <motion.div
          className="w-full h-full absolute [transform-style:preserve-3d]"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          {/* Przód fiszki (Pytanie) */}
          <div className="absolute inset-0 backface-hidden bg-white border-2 border-slate-200 rounded-3xl shadow-lg flex flex-col items-center justify-center p-8 text-center group-hover:border-blue-300 transition-colors">
            <span className="absolute top-6 left-6 text-sm font-semibold text-blue-500 uppercase tracking-wider">Pojęcie / Pytanie</span>
            <p className="text-2xl md:text-4xl font-semibold text-slate-800 leading-snug">
              {currentCard.front}
            </p>
            <div className="absolute bottom-6 flex items-center text-slate-400 text-sm gap-2">
              <RotateCcw className="w-4 h-4" /> Kliknij, aby obrócić
            </div>
          </div>

          {/* Tył fiszki (Odpowiedź) */}
          <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-3xl shadow-lg flex flex-col items-center justify-center p-8 text-center [transform:rotateY(180deg)]">
            <span className="absolute top-6 left-6 text-sm font-semibold text-indigo-500 uppercase tracking-wider">Definicja / Odpowiedź</span>
            <p className="text-xl md:text-2xl font-medium text-slate-700 leading-relaxed overflow-y-auto max-h-[80%] custom-scrollbar">
              {currentCard.back}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Przyciski nawigacyjne */}
      <div className="flex items-center justify-center gap-6 mt-10 w-full">
        <button 
          onClick={handlePrev} 
          disabled={currentIndex === 0}
          className="p-3 md:px-6 md:py-3 rounded-xl flex items-center gap-2 bg-white border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="hidden md:inline">Poprzednia</span>
        </button>

        <button 
          onClick={handleNext} 
          disabled={currentIndex === flashcards.length - 1}
          className="p-3 md:px-6 md:py-3 rounded-xl flex items-center gap-2 bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-blue-200"
        >
          <span className="hidden md:inline">Następna</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      
      {isFinished && <p className="mt-8 text-green-600 font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2"><CheckCircle2 className="w-5 h-5"/> Gratulacje! Przerobiłeś całą talię.</p>}
    </div>
  );
}