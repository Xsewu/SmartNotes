"use server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function getSubjects() {
  const supabase = getSupabaseAdminClient();
  const result = await supabase
    .from("Subject")
    .select("id, name, yearOfStudy")
    .order("yearOfStudy", { ascending: true })
    .order("name", { ascending: true });

  if (result.error) throw result.error;
  return result.data ?? [];
}
