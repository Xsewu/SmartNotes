"use server";

import { auth } from "@/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
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

  const supabase = getSupabaseAdminClient();
  const userResult = await supabase.from("User").select("id, passwordHash").eq("email", session.user.email).single();

  if (userResult.error || !userResult.data?.passwordHash) {
    return { error: "Nie znaleziono użytkownika lub hasła." };
  }

  const isValidPassword = await bcrypt.compare(currentPassword, userResult.data.passwordHash);

  if (!isValidPassword) {
    return { error: "Obecne hasło jest nieprawidłowe." };
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  const updateResult = await supabase.from("User").update({ passwordHash: newPasswordHash }).eq("email", session.user.email);

  if (updateResult.error) {
    return { error: "Błąd aktualizacji hasła." };
  }

  return { success: true };
}
