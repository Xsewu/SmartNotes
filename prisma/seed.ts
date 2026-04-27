import { PrismaClient } from '../app/generated/prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const subjects = [
    { name: "Analiza Matematyczna", yearOfStudy: 1 },
    { name: "Algebra Liniowa", yearOfStudy: 1 },
    { name: "Fizyka I", yearOfStudy: 1 },
    { name: "Programowanie Obiektowe", yearOfStudy: 2 },
    { name: "Bazy Danych", yearOfStudy: 2 },
    { name: "Sieci Komputerowe", yearOfStudy: 3 },
  ];

  for (const s of subjects) {
    await prisma.subject.upsert({
      where: { name_yearOfStudy: { name: s.name, yearOfStudy: s.yearOfStudy } },
      update: {},
      create: s,
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
