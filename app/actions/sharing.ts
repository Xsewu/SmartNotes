"use server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { assertOwner, getAuthenticatedUserId } from "@/app/actions/guards";

export type ShareRecipient = {
  id: string;
  email: string;
  image: string | null;
};

/**
 * Get all available users who can be shared with
 */
export async function getShareableUsers(): Promise<ShareRecipient[]> {
  const userId = await getAuthenticatedUserId();

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("User")
    .select("id, email, image")
    .neq("id", userId)
    .order("email", { ascending: true });

  if (error) throw error;

  return (data ?? []) as ShareRecipient[];
}

/**
 * Get sharing recipients for a specific file
 */
export async function getFileShareRecipients(fileId: string) {
  const userId = await getAuthenticatedUserId();

  const supabase = getSupabaseAdminClient();

  // Verify ownership
  const { data: file, error: fileError } = await supabase
    .from("File")
    .select("authorId")
    .eq("id", fileId)
    .single();

  if (fileError) throw fileError;
  assertOwner(file?.authorId, userId, "Brak uprawnień do tego pliku");

  // Get current recipients
  const { data: shares, error: sharesError } = await supabase
    .from("SharePermission")
    .select("recipientId")
    .eq("fileId", fileId);

  if (sharesError) throw sharesError;

  if (!shares || shares.length === 0) {
    return [];
  }

  // Get user data for recipients
  const recipientIds = shares.map((s: any) => s.recipientId);
  const { data: users, error: usersError } = await supabase
    .from("User")
    .select("id, email, image")
    .in("id", recipientIds);

  if (usersError) throw usersError;

  const userMap = new Map(users?.map((u: any) => [u.id, u]) ?? []);

  return shares.map((share: any) => {
    const user = userMap.get(share.recipientId);
    return {
      id: share.recipientId,
      email: user?.email || "",
      image: user?.image || null,
      permissionId: share.recipientId,
    };
  });
}

/**
 * Share a file with a specific user
 */
export async function addFileShare(fileId: string, recipientEmail: string) {
  const userId = await getAuthenticatedUserId();

  const normalizedRecipientEmail = recipientEmail.trim().toLowerCase();

  const supabase = getSupabaseAdminClient();

  // Verify ownership
  const { data: file, error: fileError } = await supabase
    .from("File")
    .select("authorId")
    .eq("id", fileId)
    .single();

  if (fileError) throw fileError;
  assertOwner(file?.authorId, userId, "Brak uprawnień do tego pliku");

  // Find recipient user
  const { data: recipient, error: recipientError } = await supabase
    .from("User")
    .select("id, email")
    .eq("email", normalizedRecipientEmail)
    .single();

  if (recipientError || !recipient) {
    throw new Error("Nie znaleziono użytkownika o podanym adresie email");
  }

  if (recipient.id === userId) {
    throw new Error("Nie możesz udostępnić pliku samemu sobie");
  }

  // Check if already shared
  const { data: existing } = await supabase
    .from("SharePermission")
    .select("id")
    .eq("fileId", fileId)
    .eq("recipientId", recipient.id)
    .maybeSingle();

  if (existing) {
    throw new Error("Plik jest już udostępniony dla tego użytkownika");
  }

  // Add share
  const crypto = await import("crypto");
  const { error: insertError } = await supabase
    .from("SharePermission")
    .insert({
      id: crypto.randomUUID(),
      fileId,
      recipientId: recipient.id,
      createdAt: new Date().toISOString(),
    });

  if (insertError) throw insertError;

  revalidatePath("/dashboard");
  return { success: true, recipientEmail: recipient.email };
}

/**
 * Remove file share from a specific user
 */
export async function removeFileShare(fileId: string, recipientId: string) {
  const userId = await getAuthenticatedUserId();

  const supabase = getSupabaseAdminClient();

  // Verify ownership
  const { data: file, error: fileError } = await supabase
    .from("File")
    .select("authorId")
    .eq("id", fileId)
    .single();

  if (fileError) throw fileError;
  assertOwner(file?.authorId, userId, "Brak uprawnień do tego pliku");

  // Remove share
  const { error: deleteError } = await supabase
    .from("SharePermission")
    .delete()
    .eq("fileId", fileId)
    .eq("recipientId", recipientId);

  if (deleteError) throw deleteError;

  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Change file visibility level (PRIVATE, DIRECT, GROUP, YEAR)
 */
export async function updateFileVisibility(fileId: string, visibility: "PRIVATE" | "DIRECT" | "GROUP" | "YEAR") {
  const userId = await getAuthenticatedUserId();

  const supabase = getSupabaseAdminClient();

  // Verify ownership
  const { data: file, error: fileError } = await supabase
    .from("File")
    .select("authorId")
    .eq("id", fileId)
    .single();

  if (fileError) throw fileError;
  assertOwner(file?.authorId, userId, "Brak uprawnień do tego pliku");

  // Update visibility
  const { error: updateError } = await supabase
    .from("File")
    .update({ visibility })
    .eq("id", fileId);

  if (updateError) throw updateError;

  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Get sharing statistics for a file
 */
export async function getFileSharingStats(fileId: string) {
  const userId = await getAuthenticatedUserId();

  const supabase = getSupabaseAdminClient();

  // Verify ownership
  const { data: file, error: fileError } = await supabase
    .from("File")
    .select("authorId, visibility")
    .eq("id", fileId)
    .single();

  if (fileError) throw fileError;
  assertOwner(file?.authorId, userId, "Brak uprawnień do tego pliku");

  // Get share count
  const { count: directShareCount } = await supabase
    .from("SharePermission")
    .select("id", { count: "exact", head: true })
    .eq("fileId", fileId);

  const visibilityLabels: Record<string, string> = {
    PRIVATE: "Prywatny",
    DIRECT: "Bezpośredni dostęp",
    GROUP: "Dostępne dla grupy",
    YEAR: "Dostępne dla roku",
  };

  return {
    visibility: file.visibility,
    visibilityLabel: visibilityLabels[file.visibility] || file.visibility,
    directShareCount: directShareCount ?? 0,
  };
}
