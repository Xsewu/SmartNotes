"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";

export async function changePassword(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) {
    return { error: "Brak autoryzacji." };
  }

  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "Wszystkie pola są wymagane." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "Nowe hasła nie są identyczne." };
  }

  if (newPassword.length < 6) {
    return { error: "Nowe hasło musi mieć co najmniej 6 znaków." };
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user || !user.passwordHash) {
    return { error: "Nie znaleziono użytkownika lub hasła." };
  }

  const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);

  if (!isValidPassword) {
    return { error: "Obecne hasło jest nieprawidłowe." };
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { email: session.user.email },
    data: { passwordHash: newPasswordHash },
  });

  return { success: true };
}
