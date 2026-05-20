"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateFlashcards } from "@/app/actions/flashcards";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface FlashcardButtonProps {
  fileId: string;
  format: string;
}

export function FlashcardButton({ fileId, format }: FlashcardButtonProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);

  const isSupported = format.toLowerCase() === "pdf" || format.toLowerCase() === "html";

  const handleGenerate = async () => {
    // Dodatkowe zabezpieczenie po stronie UI
    if (!isSupported) {
      toast.error("Fiszki AI można generować tylko z plików PDF i notatek HTML.");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateFlashcards(fileId);
      if (result.success) {
        toast.success("Fiszki zostały wygenerowane pomyślnie!");
        router.push(`/flashcards/${result.deckId}`);
      } else {
        toast.error(result.error || "Wystąpił błąd podczas generowania fiszek.");
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Wystąpił błąd podczas komunikacji z AI.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGenerate}
      disabled={isGenerating || !isSupported}
      title={!isSupported ? "Dostępne tylko dla formatu PDF i HTML" : "Stwórz inteligentne fiszki z tego pliku"}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-transparent bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-3 sm:py-1.5"
    >
      {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      {isGenerating ? "Generowanie..." : "Generuj fiszki"}
    </button>
  );
}