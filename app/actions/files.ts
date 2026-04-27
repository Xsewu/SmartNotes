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
      subject: true,
      sharePermissions: { include: { recipient: { select: { email: true } } } },
      ratings: true,
      favorites: { where: { userId: user.id } },
      _count: {
        select: { favorites: true, comments: true }
      }
    },
    orderBy: { createdAt: "desc" },
  });

  return files.map((file) => {
    const avgRating = file.ratings.length > 0
      ? file.ratings.reduce((acc, r) => acc + r.value, 0) / file.ratings.length
      : 0;
      
    return {
      id: file.id,
      title: file.title,
      category: file.tags?.[0]?.tag?.name || "Inne",
      tags: file.tags.map((t) => `#${t.tag.name.toLowerCase()}`),
      subject: file.subject?.name || null,
      subjectId: file.subjectId,
      updatedAt: new Date(file.createdAt).toLocaleDateString("pl-PL"),
      pages: file.pages,
      visibility: file.visibility,
      sharedWith: 
        file.visibility === Visibility.PRIVATE && file.sharePermissions.length > 0 
          ? file.sharePermissions.map(p => p.recipient.email).join(", ")
          : file.visibility,
      accent: "from-blue-500 to-indigo-400",
      url: file.url,
      isFavorite: file.favorites.length > 0,
      favoritesCount: file._count.favorites,
      commentsCount: file._count.comments,
      rating: parseFloat(avgRating.toFixed(1)),
    };
  });
}

export async function getUserStats() {
  const session = await auth();
  if (!session?.user?.id) {
    return { uploaded: 0, saved: 0, activity: "Brak", newFiles: 0 };
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { id: true },
  });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [uploaded, saved, comments, newFiles] = await Promise.all([
    prisma.file.count({ where: { authorId: session.user.id } }),
    prisma.favorite.count({ where: { userId: session.user.id } }),
    prisma.comment.count({ where: { userId: session.user.id } }),
    prisma.file.count({
      where: {
        createdAt: { gte: sevenDaysAgo },
        authorId: { not: session.user.id },
        OR: [
          { visibility: "YEAR" },
          { visibility: "GROUP" },
          { sharePermissions: { some: { recipientId: session.user.id } } }
        ]
      }
    })
  ]);

  let activity = "Niska";
  const totalInteractions = uploaded * 2 + saved + comments;
  if (totalInteractions > 10) activity = "Średnia";
  if (totalInteractions > 25) activity = "Wysoka";

  return { uploaded, saved, activity, newFiles };
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

export async function toggleFavorite(fileId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Nieautoryzowany");

  const existing = await prisma.favorite.findUnique({
    where: { userId_fileId: { userId: session.user.id, fileId } },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    revalidatePath("/dashboard");
    return { isFavorite: false };
  } else {
    await prisma.favorite.create({ data: { userId: session.user.id, fileId } });
    revalidatePath("/dashboard");
    return { isFavorite: true };
  }
}

export async function rateFile(fileId: string, value: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Nieautoryzowany");

  await prisma.rating.upsert({
    where: { userId_fileId: { userId: session.user.id, fileId } },
    update: { value },
    create: { userId: session.user.id, fileId, value },
  });
  revalidatePath("/dashboard");
  return { success: true };
}

export async function getFileComments(fileId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Nieautoryzowany");

  const comments = await prisma.comment.findMany({
    where: { fileId },
    include: {
      user: { select: { email: true, id: true, image: true } }
    },
    orderBy: { createdAt: "desc" },
  });

  return comments.map(c => ({
    id: c.id,
    content: c.content,
    createdAt: c.createdAt.toISOString(),
    authorEmail: c.user.email,
    authorImage: c.user.image,
    isAuthor: c.user.id === session.user.id,
  }));
}

export async function addComment(fileId: string, content: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Nieautoryzowany");

  await prisma.comment.create({
    data: {
      content,
      userId: session.user.id,
      fileId,
    }
  });
  
  revalidatePath("/dashboard");
  return { success: true };
}
