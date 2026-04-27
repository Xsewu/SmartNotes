"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

export async function uploadAvatar(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Nieautoryzowany");

  const file = formData.get("file") as File;
  if (!file) throw new Error("Nie przęsłano żadnego pliku.");

  if (!file.type.startsWith("image/")) {
    throw new Error("Dozwolone są tylko pliki graficzne.");
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Zapis do folderu publicznego umozliwi bezpośredni dostęp przez przeglądarkę
  const fileName = `${uuidv4()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "")}`;
  const uploadDir = join(process.cwd(), "public", "avatars");
  
  await mkdir(uploadDir, { recursive: true });
  
  const filePath = join(uploadDir, fileName);
  await writeFile(filePath, buffer);

  const avatarUrl = `/avatars/${fileName}`;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { image: avatarUrl },
  });

  revalidatePath("/dashboard");
  revalidatePath("/settings");

  return { success: true, avatarUrl };
}