import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { generateFlashcards, getFlashcardDeck } from "../app/actions/flashcards";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/db/prisma", () => ({
  prisma: {
    file: {
      findUnique: jest.fn(),
    },
    flashcardDeck: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("pdf-parse/lib/pdf-parse.js", () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe("flashcards actions", () => {
  const mockedAuth = auth as jest.MockedFunction<typeof auth>;
  const mockedPrisma = prisma as unknown as {
    file: { findUnique: jest.Mock };
    flashcardDeck: { create: jest.Mock; findUnique: jest.Mock };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-api-key";
    global.fetch = jest.fn();
  });

  it("returns a flashcard deck only for its owner", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } } as never);
    mockedPrisma.flashcardDeck.findUnique.mockResolvedValue({
      id: "deck-1",
      title: "Deck 1",
      userId: "user-1",
      flashcards: [{ id: "card-1", front: "Front", back: "Back" }],
    });

    await expect(getFlashcardDeck("deck-1")).resolves.toMatchObject({
      id: "deck-1",
      userId: "user-1",
    });
    expect(mockedPrisma.flashcardDeck.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "deck-1" },
        include: { flashcards: true },
      })
    );
  });

  it("rejects flashcard generation for files the user cannot access", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-2" } } as never);
    mockedPrisma.file.findUnique.mockResolvedValue({
      id: "file-1",
      title: "Private note",
      url: "https://example.com/private.html",
      format: "html",
      authorId: "user-1",
      visibility: "PRIVATE",
      sharePermissions: [],
    });

    const result = await generateFlashcards("file-1");

    expect(result).toEqual({
      success: false,
      error: "Brak uprawnień do generowania fiszek z tego pliku",
    });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockedPrisma.flashcardDeck.create).not.toHaveBeenCalled();
  });
});
