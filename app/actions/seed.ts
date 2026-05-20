import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Rozpoczynam dodawanie przedmiotów z Informatyki (WEiI PRz)...');

  const subjects = [
    // Rok 1
    { name: 'Matematyka (Analiza i Algebra)', yearOfStudy: 1 },
    { name: 'Fizyka', yearOfStudy: 1 },
    { name: 'Podstawy programowania', yearOfStudy: 1 },
    { name: 'Architektura systemów komputerowych', yearOfStudy: 2 },
    { name: 'Technologie internetowe', yearOfStudy: 1 },
    { name: 'Logika i teorii mnogości', yearOfStudy: 1 },
    
    // Rok 2
    { name: 'Algorytmy i struktury danych', yearOfStudy:1 },
    { name: 'Programowanie obiektowe C++', yearOfStudy: 2 },
    { name: 'Systemy operacyjne', yearOfStudy: 2 },
    { name: 'Bazy danych', yearOfStudy: 2 },
    { name: 'Sieci komputerowe', yearOfStudy: 2 },
    { name: 'Języki, automaty i obliczenia', yearOfStudy: 1 },

    // Rok 3
    { name: 'Inżynieria oprogramowania', yearOfStudy: 3 },
    { name: 'Grafika komputerowa', yearOfStudy: 3 },
    { name: 'Sztuczna inteligencja', yearOfStudy: 3 },
    { name: 'Podstawy automatyki i sterowania', yearOfStudy: 3 },
    { name: 'Ochrona danych i bezpieczeństwo systemów', yearOfStudy: 3 },
    { name: 'Technologie mobilne', yearOfStudy: 3 },
    { name: 'Programowanie aplikacji internetowych', yearOfStudy: 3 },

    // Rok 4 (Inżynierski)
    { name: 'Seminarium dyplomowe', yearOfStudy: 4 },
    { name: 'Zarządzanie projektami informatycznymi', yearOfStudy: 4 },
  ];

  // Iterujemy i dodajemy (lub ignorujemy, jeśli już taki istnieje)
  for (const subject of subjects) {
    const existing = await prisma.subject.findFirst({ where: { name: subject.name } });
    if (!existing) {
      await prisma.subject.create({ data: subject });
    }
  }

  console.log('Zakończono dodawanie przedmiotów!');
}

main()
  .catch((e) => {
    console.error('Wystąpił błąd podczas seedowania:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });