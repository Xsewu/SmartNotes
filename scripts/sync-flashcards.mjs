import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Creating FlashcardDeck table...");
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "FlashcardDeck" (
        "id" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "fileId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        CONSTRAINT "FlashcardDeck_pkey" PRIMARY KEY ("id")
    );
  `);
  
  console.log("Creating Flashcard table...");
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Flashcard" (
        "id" TEXT NOT NULL,
        "front" TEXT NOT NULL,
        "back" TEXT NOT NULL,
        "deckId" TEXT NOT NULL,
        CONSTRAINT "Flashcard_pkey" PRIMARY KEY ("id")
    );
  `);

  console.log("Adding foreign keys...");
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "FlashcardDeck" ADD CONSTRAINT "FlashcardDeck_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
  } catch (e) { console.log("Warning: ", e.message) }
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "FlashcardDeck" ADD CONSTRAINT "FlashcardDeck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
  } catch (e) { console.log("Warning: ", e.message) }
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Flashcard" ADD CONSTRAINT "Flashcard_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "FlashcardDeck"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
  } catch (e) { console.log("Warning: ", e.message) }
  
  console.log("Done.");
}

main().catch(console.error).finally(() => prisma.$disconnect());