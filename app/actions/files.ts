"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/auth";
import { Visibility } from "@/app/generated/prisma/client";
import { revalidatePath } from "next/cache";

export async function getDashboardFiles() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Nieautoryzowany");
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { id: true, studyGroup: true, yearOfStudy: true },
  });

  const files = await prisma.file.findMany({
    where: {
      OR: [
        { authorId: user.id },
        {
          sharePermissions: {
            some: { recipientId: user.id },
          },
        },
        { visibility: Visibility.GROUP },
        { visibility: Visibility.YEAR },
      ],
    },
    include: {
      tags: { include: { tag: true } },
      sharePermissions: { include: { recipient: { select: { email: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return files.map((file) => ({
    id: file.id,
    title: file.title,
    category: file.tags?.[0]?.tag?.name || "Inne",
    tags: file.tags.map((t) => `#${t.tag.name.toLowerCase()}`),
    updatedAt: new Date(file.createdAt).toLocaleDateString("pl-PL"),
    pages: file.pages,
    visibility: file.visibility,
    sharedWith: 
      file.visibility === Visibility.PRIVATE && file.sharePermissions.length > 0 
        ? file.sharePermissions.map(p => p.recipient.email).join(", ")
        : file.visibility,
    accent: "from-blue-500 to-indigo-400",
    url: file.url,
  }));
}

export async function handleShareUser(fileId: string, recipientEmail: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Nieautoryzowany");
  }

  const recipient = await prisma.user.findUnique({
    where: { email: recipientEmail.toLowerCase() },
  });

  if (!recipient) {
    throw new Error("Nie znaleziono użytkownika o podanym adresie email.");
  }

  // Weryfikacja uprawnień do edycji
  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file || file.authorId !== session.user.id) {
    throw new Error("Brak uprawnień do nadawania dostępów temu plikowi.");
  }

  await prisma.sharePermission.upsert({
    where: {
      fileId_recipientId: {
        fileId,
        recipientId: recipient.id,
      },
    },
    update: {},
    create: {
      fileId,
      recipientId: recipient.id,
    },
  });

  revalidatePath("/dashboard");
  return { success: true, recipientEmail: recipient.email };
}
