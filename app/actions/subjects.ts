"use server";

import { prisma } from "@/lib/db/prisma";

export async function getSubjects() {
  return prisma.subject.findMany({
    orderBy: [
      { yearOfStudy: "asc" },
      { name: "asc" },
    ],
  });
}
