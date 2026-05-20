import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

// Wczytujemy najpierw lokalne zmienne z .env.local, a potem z .env
dotenv.config({ path: '.env.local' });
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('Rozpoczynam dodawanie przedmiotów z Informatyki (WEiI PRz)...');

  const subjects = [
    { name: "Analiza Matematyczna", yearOfStudy: 1 },
    { name: "Algebra Liniowa", yearOfStudy: 1 },
    { name: "Fizyka I", yearOfStudy: 1 },
    { name: "Programowanie Obiektowe", yearOfStudy: 2 },
    { name: "Bazy Danych", yearOfStudy: 2 },
    { name: "Sieci Komputerowe", yearOfStudy: 3 },
  ];

  console.log('Rozpoczynam dodawanie przedmiotów...');
  for (const s of subjects) {
    await prisma.subject.upsert({
      where: { name_yearOfStudy: { name: s.name, yearOfStudy: s.yearOfStudy } },
      update: {},
      create: s,
    });
  }

  console.log('Dodawanie kont testowych...');
  const hashedPassword = await bcrypt.hash('haslo123', 10);

  // Konto Administratora
  await prisma.user.upsert({
    where: { email: '179555@stud.prz.edu.pl' },
    update: {},
    create: {
      id: randomUUID(),
      email: '179505@stud.prz.edu.pl',
      passwordHash: hashedPassword,
      role: 'ADMIN',
    },
  });

  // Konto Studenta
  await prisma.user.upsert({
    where: { email: 'student@stud.prz.edu.pl' },
    update: {},
    create: {
      id: randomUUID(),
      email: 'student@stud.prz.edu.pl',
      passwordHash: hashedPassword,
      role: 'STUDENT',
      yearOfStudy: 1,
      studyGroup: 'IN11',
    },
  });

  // Konto Starosty Roku (Year Leader - Rok 1)
  await prisma.user.upsert({
    where: { email: 'starosta.roku@stud.prz.edu.pl' },
    update: {},
    create: {
      id: randomUUID(),
      email: 'starosta.roku@stud.prz.edu.pl',
      passwordHash: hashedPassword,
      role: 'ADMIN',
      yearOfStudy: 1,
    },
  });

  // Konto Starosty Grupy (Lab Leader - Grupa IN11)
  await prisma.user.upsert({
    where: { email: 'starosta.grupy@stud.prz.edu.pl' },
    update: {},
    create: {
      id: randomUUID(),
      email: 'starosta.grupy@stud.prz.edu.pl',
      passwordHash: hashedPassword,
      role: 'ADMIN',
      yearOfStudy: 1,
      studyGroup: 'IN11',
    },
  });

  console.log('Zakończono dodawanie przedmiotów!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
