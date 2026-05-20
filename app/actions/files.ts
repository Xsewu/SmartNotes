"use server";

import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId, assertOwner } from "@/app/actions/guards";
import { revalidatePath } from "next/cache";

export async function getDashboardFiles() {
  const userId = await getAuthenticatedUserId();

  const files = await prisma.file.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      tags: { include: { tag: true } },
      sharePermissions: { include: { recipient: true } },
      favorites: true,
      ratings: true,
      comments: true,
      subject: true,
    }
  });

  return files
    .filter((file) =>
      file.authorId === userId ||
      file.visibility === "GROUP" ||
      file.visibility === "YEAR" ||
      file.sharePermissions.some((sp) => sp.recipientId === userId)
    )
    .map((file) => {
      const fileTags = file.tags.map((ft) => ft.tag);
      const avgRating = file.ratings.length > 0 
        ? file.ratings.reduce((acc, r) => acc + r.value, 0) / file.ratings.length 
        : 0;
      
      const directShares = file.sharePermissions.map((sp) => sp.recipient.email);
      const visibilityLabels: Record<string, string> = {
        PRIVATE: directShares.length > 0 ? `Wybrani (${directShares.length})` : "Prywatny",
        DIRECT: "Wybrani użytkownicy",
        GROUP: "Dostępne dla grupy",
        YEAR: "Dostępne dla roku",
      };

      return {
        id: file.id,
        title: file.title,
        category: fileTags[0]?.name || "Inne",
        tags: fileTags.map((t) => `#${t.name.toLowerCase()}`),
        subject: file.subject?.name || null,
        subjectId: file.subjectId,
        updatedAt: new Date(file.createdAt).toLocaleDateString("pl-PL"),
        pages: file.pages,
        visibility: file.visibility,
        sharedWith: visibilityLabels[file.visibility] || file.visibility,
        accent: "from-blue-500 to-indigo-400",
        url: file.url,
        format: file.format,
        isFavorite: file.favorites.some((f) => f.userId === userId),
        favoritesCount: file.favorites.length,
        commentsCount: file.comments.length,
        rating: parseFloat(avgRating.toFixed(1)),
        authorId: file.authorId,
      };
    });
}

export async function getUserStats() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return { uploaded: 0, saved: 0, activity: "Brak", newFiles: 0 };
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const uploaded = await prisma.file.count({ where: { authorId: userId } });
  const saved = await prisma.favorite.count({ where: { userId } });
  const comments = await prisma.comment.count({ where: { userId } });
  const recentFiles = await prisma.file.findMany({
    where: {
      createdAt: { gte: sevenDaysAgo },
      authorId: { not: userId }
    },
    select: { id: true, visibility: true }
  });
  const sharedWithMe = await prisma.sharePermission.findMany({
    where: { recipientId: userId },
    select: { fileId: true }
  });

  const sharedFileIds = new Set(sharedWithMe.map(s => s.fileId));
  const newFiles = recentFiles.filter(
    f => f.visibility === "YEAR" || f.visibility === "GROUP" || sharedFileIds.has(f.id)
  ).length;

  let activity = "Niska";
  const totalInteractions = uploaded * 2 + saved + comments;
  if (totalInteractions > 10) activity = "Średnia";
  if (totalInteractions > 25) activity = "Wysoka";

  return { uploaded, saved, activity, newFiles };
}

export async function handleShareUser(fileId: string, recipientEmail: string) {
  const userId = await getAuthenticatedUserId();

  const recipient = await prisma.user.findUnique({
    where: { email: recipientEmail.toLowerCase() },
    select: { id: true, email: true }
  });

  if (!recipient) {
    throw new Error("Nie znaleziono użytkownika o podanym adresie email.");
  }

  const file = await prisma.file.findUnique({
    where: { id: fileId },
    select: { authorId: true }
  });

  assertOwner(file?.authorId, userId, "Brak uprawnień do nadawania dostępów temu plikowi.");

  const existing = await prisma.sharePermission.findUnique({
    where: {
      fileId_recipientId: {
        fileId,
        recipientId: recipient.id,
      }
    }
  });

  if (existing) {
    revalidatePath("/dashboard");
    return { success: true, recipientEmail: recipient.email };
  }

  await prisma.sharePermission.create({
    data: {
      fileId,
      recipientId: recipient.id,
    }
  });

  revalidatePath("/dashboard");
  return { success: true, recipientEmail: recipient.email };
}

export async function toggleFavorite(fileId: string) {
  const userId = await getAuthenticatedUserId();

  const existing = await prisma.favorite.findUnique({
    where: {
      userId_fileId: {
        userId,
        fileId,
      }
    }
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    revalidatePath("/dashboard");
    return { isFavorite: false };
  } else {
    await prisma.favorite.create({
      data: {
        userId,
        fileId,
      }
    });
    revalidatePath("/dashboard");
    return { isFavorite: true };
  }
}

export async function rateFile(fileId: string, value: number) {
  const userId = await getAuthenticatedUserId();

  const existing = await prisma.rating.findUnique({
    where: {
      userId_fileId: {
        userId,
        fileId,
      }
    }
  });

  if (existing) {
    await prisma.rating.update({
      where: { id: existing.id },
      data: { value }
    });
  } else {
    await prisma.rating.create({
      data: {
        userId,
        fileId,
        value,
      }
    });
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function getFileComments(fileId: string) {
  const userId = await getAuthenticatedUserId();

  const comments = await prisma.comment.findMany({
    where: { fileId },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, email: true, image: true } } }
  });

  return comments.map((c) => ({
    id: c.id,
    content: c.content,
    createdAt: c.createdAt.toISOString(),
    authorEmail: c.user.email,
    authorImage: c.user.image,
    isAuthor: c.userId === userId,
  }));
}

export async function addComment(fileId: string, content: string) {
  const userId = await getAuthenticatedUserId();

  await prisma.comment.create({
    data: {
      content,
      userId,
      fileId,
    }
  });
  
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteFile(fileId: string) {
  const userId = await getAuthenticatedUserId();

  const file = await prisma.file.findUnique({ where: { id: fileId } });
  
  assertOwner(file?.authorId, userId, "Brak uprawnień do usunięcia tego pliku.");

  await prisma.file.delete({ where: { id: fileId } });
  
  revalidatePath("/dashboard");
  return { success: true };
}
