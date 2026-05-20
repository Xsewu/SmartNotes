import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  // Prevent multiple instances of PrismaClient in development (HMR).
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  let connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error("❌ BŁĄD: Brak zmiennej DATABASE_URL!");
  }

  // Remove sslmode=require from the connection string so it doesn't override our custom ssl config
  connectionString = connectionString.replace('?sslmode=require', '').replace('&sslmode=require', '');

  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter
  });
}

// Usuwamy starą instancję z pamięci podręcznej (HMR), aby wymusić nowe połączenie
if (process.env.NODE_ENV !== "production") global.__prisma = undefined;

export const prisma: PrismaClient =
  global.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
