"use server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
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

  // Upload avatar to Supabase Storage (public) and update user.image to public URL
  const fileName = `avatars/${uuidv4()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "")}`;
  const supabase = getSupabaseAdminClient();

  const { error: storageError } = await supabase.storage.from("uploads").upload(fileName, buffer, {
    contentType: file.type,
    upsert: false,
  });

  if (storageError) {
    console.error("Avatar storage error:", storageError);
    throw new Error("Błąd podczas wgrywania avatara do Storage.");
  }

  const { data: publicData } = supabase.storage.from("uploads").getPublicUrl(fileName);
  const avatarUrl = publicData?.publicUrl || `/avatars/${fileName}`;
  console.log("uploadAvatar -> user:", session.user.id, "avatarUrl:", avatarUrl);

  // Ensure user exists and then update image
  const { data: upsertUser, error: upsertErr } = await supabase
    .from("User")
    .upsert({ id: session.user.id, email: session.user.email?.toLowerCase() ?? session.user.id, updatedAt: new Date().toISOString() }, { onConflict: "id" })
    .select("id")
    .single();

  if (upsertErr || !upsertUser) {
    console.error("User upsert error:", upsertErr);
    throw new Error("Błąd synchronizacji użytkownika przed aktualizacją avatara.");
  }

  const updateResult = await supabase.from("User").update({ image: avatarUrl }).eq("id", session.user.id);
  if (updateResult.error) {
    console.error("User update error:", updateResult.error);
    throw new Error("Błąd aktualizacji profilu.");
  }

  console.log("uploadAvatar -> updated user:", session.user.id);

  revalidatePath("/dashboard");
  revalidatePath("/settings");

  return { success: true, avatarUrl };
}