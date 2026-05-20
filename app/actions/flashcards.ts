'use server'

import { prisma } from '@/lib/db/prisma';
import { assertOwner, getAuthenticatedUserId } from '@/app/actions/guards';

// Omijamy plik główny (index.js) biblioteki, który powoduje ten błąd
// @ts-expect-error pdf-parse/lib/pdf-parse.js has no usable default type export here
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

export async function generateFlashcards(fileId: string) {
  try {
    console.log(`\n--- START [generateFlashcards] dla pliku: ${fileId} ---`);
    console.log(`1. Autoryzacja...`);
    // 1. Sprawdzenie autoryzacji
    const userId = await getAuthenticatedUserId("Nieautoryzowany dostęp");
    console.log(`Autoryzacja OK. UserID: ${userId}`);

    console.log(`2. Szukam pliku w bazie...`);
    // 2. Pobranie pliku z bazy danych
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        sharePermissions: {
          select: { recipientId: true },
        },
      },
    });

    if (!file) throw new Error("Nie znaleziono pliku");

    const canAccessFile =
      file.authorId === userId ||
      file.visibility === "GROUP" ||
      file.visibility === "YEAR" ||
      file.sharePermissions.some((sharePermission) => sharePermission.recipientId === userId);

    if (!canAccessFile) {
      throw new Error("Brak uprawnień do generowania fiszek z tego pliku");
    }
    
    console.log(`Plik znaleziony: "${file.title}" (URL: ${file.url})`);
    
    // Sprawdzamy format pliku
    const isPdf = file.format.toLowerCase() === 'pdf' || file.url.toLowerCase().endsWith('.pdf');
    const isHtml = file.format.toLowerCase() === 'html' || file.url.toLowerCase().endsWith('.html');

    if (!isPdf && !isHtml) {
      throw new Error("Tylko pliki PDF oraz wbudowane notatki HTML są wspierane do generowania fiszek");
    }

    console.log(`3. Pobieranie pliku z URL (Supabase Storage)...`);
    // 3. Pobranie zawartości pliku z Supabase Storage (lub innego URL)
    const response = await fetch(file.url);
    if (!response.ok) throw new Error("Nie udało się pobrać pliku do analizy");
    
    let textContent = "";

    if (isPdf) {
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      console.log(`Plik PDF pobrany pomyślnie. Rozmiar: ${buffer.length} bajtów. Parsowanie...`);
      const pdfData = await pdfParse(buffer);
      textContent = pdfData.text;
    } else if (isHtml) {
      console.log(`Plik HTML (Notatka) pobrany pomyślnie. Rozpoczynam wyciąganie tekstu...`);
      const htmlString = await response.text();
      // Usuwamy sekcje <style>, a następnie wszystkie tagi HTML zostawiając sam tekst
      const cleanHtml = htmlString.replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, '');
      textContent = cleanHtml.replace(/<[^>]*>?/gm, ' ').replace(/\s\s+/g, ' ').trim();
    }

    if (!textContent || textContent.trim() === '') {
      throw new Error("Plik jest pusty lub AI nie potrafi odczytać z niego tekstu (np. to tylko skany/obrazki)");
    }
    console.log(`Sukces! Wyciągnięto tekst o długości: ${textContent.length} znaków.`);

    // Limitujemy tekst do ok. 20000 znaków, żeby nie przekroczyć limitów API OpenAI dla jednego żądania
    const limitedText = textContent.substring(0, 20000);

    console.log(`5. Wysyłanie zapytania do Groq Cloud (Llama 3)...`);
    
    const groqApiKey = process.env.GROQ_API_KEY;
    
    if (!groqApiKey) throw new Error("Brak klucza GROQ_API_KEY w pliku .env");

    // 5. Wysłanie tekstu do Groq w celu wygenerowania fiszek (JSON)
    const groqResponse = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `Jesteś nauczycielem akademickim. Twoim zadaniem jest stworzenie 10 wartościowych fiszek (flashcards) na podstawie dostarczonych notatek studenta. 
Zwróć wynik WYŁĄCZNIE jako poprawny obiekt JSON o strukturze:
{ "flashcards": [ { "front": "pojęcie / pytanie", "back": "definicja / odpowiedź" } ] }`
          },
          {
            role: "user",
            content: `Oto tekst z notatek:\n\n${limitedText}`
          }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!groqResponse.ok) {
      const errorDetails = await groqResponse.text();
      console.error(`\n❌ SZCZEGÓŁY BŁĘDU GROQ (Status: ${groqResponse.status}):`, errorDetails);
      throw new Error(`Błąd Groq API (${groqResponse.status}). Sprawdź logi w terminalu.`);
    }
    console.log(`Otrzymano odpowiedź z Groq!`);

    // 6. Parsowanie odpowiedzi
    const aiData = await groqResponse.json();
    const textResponse = aiData.choices[0].message.content;
    const parsedContent = JSON.parse(textResponse);
    const flashcardsData = parsedContent.flashcards;
    console.log(`AI wygenerowało fiszek: ${flashcardsData?.length || 0}`);

    console.log(`7. Zapisywanie fiszek do bazy danych...`);
    // 7. Zapisanie talii (Deck) i fiszek do bazy danych powiązanych z autorem i plikiem
    const deck = await prisma.flashcardDeck.create({
      data: {
        title: `Fiszki AI: ${file.title}`,
        userId: userId,
        fileId: file.id,
        flashcards: { create: flashcardsData } // Zagnieżdżony zapis fiszek Prisma!
      }
    });

    console.log(`--- KONIEC [generateFlashcards] - SUKCES (DeckID: ${deck.id}) ---\n`);
    return { success: true, deckId: deck.id };
  } catch (error: unknown) {
    console.error("AI Flashcards Error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Nieznany błąd" };
  }
}

export async function updateFlashcardDeckTitle(deckId: string, newTitle: string) {
  const userId = await getAuthenticatedUserId();
  
  const deck = await prisma.flashcardDeck.findUnique({ where: { id: deckId } });
  assertOwner(deck?.userId, userId, "Brak dostępu");
  
  await prisma.flashcardDeck.update({
    where: { id: deckId },
    data: { title: newTitle }
  });
  
  return { success: true };
}

export async function deleteFlashcardDeck(deckId: string) {
  const userId = await getAuthenticatedUserId();
  
  const deck = await prisma.flashcardDeck.findUnique({ where: { id: deckId } });
  assertOwner(deck?.userId, userId, "Brak dostępu");
  
  await prisma.flashcardDeck.delete({
    where: { id: deckId }
  });
  
  return { success: true };
}

export async function getFlashcardDeck(deckId: string) {
  const userId = await getAuthenticatedUserId();

  const deck = await prisma.flashcardDeck.findUnique({
    where: { id: deckId },
    include: {
      flashcards: true,
    },
  });

  assertOwner(deck?.userId, userId, "Brak dostępu");

  return deck;
}