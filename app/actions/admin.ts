"use server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

type AdminUser = {
  role?: string;
  studyGroup?: string | null;
  yearOfStudy?: number | null;
};

export async function isAdminUser(current: AdminUser) {
  return current?.role === "ADMIN";
}

export async function getEffectiveRole(user: AdminUser) {
  if (!user) return undefined;
  if (user.studyGroup) return "LAB_LEADER";
  if (user.yearOfStudy != null) return "YEAR_LEADER";
  return user.role;
}

export async function isYearLeaderManaging(current: AdminUser, year: number) {
  return (await getEffectiveRole(current)) === "YEAR_LEADER" && current?.yearOfStudy === year;
}

export async function isLabLeaderManaging(current: AdminUser, group: string) {
  return (await getEffectiveRole(current)) === "LAB_LEADER" && current?.studyGroup === group;
}

export async function getManagedMembers(query?: string) {
  const me = await auth();
  if (!me?.user) return { error: "Not authenticated" };

  const supabase = getSupabaseAdminClient();
  const role = await getEffectiveRole(me.user as any);

  if (role === "ADMIN") {
    let q = supabase.from("User").select("id,email,role,studyGroup,yearOfStudy");
    if (query) q = q.ilike("email", `%${query}%`);
    const { data, error } = await q.order("email", { ascending: true });
    return { data, error };
  }

  if (role === "YEAR_LEADER") {
    const year = me.user.yearOfStudy;
    let q = supabase.from("User").select("id,email,role,studyGroup,yearOfStudy").eq("yearOfStudy", year);
    if (query) q = q.ilike("email", `%${query}%`);
    const { data, error } = await q.order("email", { ascending: true });
    return { data, error };
  }

  if (role === "LAB_LEADER") {
    const group = me.user.studyGroup;
    let q = supabase.from("User").select("id,email,role,studyGroup,yearOfStudy").eq("studyGroup", group);
    if (query) q = q.ilike("email", `%${query}%`);
    const { data, error } = await q.order("email", { ascending: true });
    return { data, error };
  }

  return { data: [] };
}

export async function changeUserRole(
  targetUserId: string,
  newRole: string,
  scope?: { yearOfStudy?: number | null; studyGroup?: string | null }
) {
  const me = await auth();
  if (!me?.user) return { error: "Not authenticated" };

  const supabase = getSupabaseAdminClient();

  // Fetch the latest profile of the person performing the action
  const { data: actor } = await supabase.from("User").select("role,studyGroup,yearOfStudy").eq("id", me.user.id).single();
  if (!actor) return { error: "Admin profile not found" };

  // fetch target user to evaluate authorization
  const { data: target } = await supabase.from("User").select("id,email,role,studyGroup,yearOfStudy").eq("id", targetUserId).single();
  if (!target) return { error: "Target user not found" };

  // Authorization rules
  if (await isAdminUser(actor)) {
    // allowed
  } else if (newRole === "LAB_LEADER" || (await getEffectiveRole(target)) === "LAB_LEADER") {
    // only admin or year leader of same year can change lab leader within the same year, or existing lab leader's group
    if (!(await isYearLeaderManaging(actor, target.yearOfStudy) || await isLabLeaderManaging(actor, target.studyGroup))) {
      return { error: "Not authorized" };
    }
  } else if (newRole === "YEAR_LEADER" || (await getEffectiveRole(target)) === "YEAR_LEADER") {
    // only admin can change year leaders
    if (!(await isAdminUser(actor))) return { error: "Not authorized" };
  } else {
    // promoting/demoting to student: lab leader/year leader/admin can demote within their scope
    if (!(await isAdminUser(actor) || await isYearLeaderManaging(actor, target.yearOfStudy) || await isLabLeaderManaging(actor, target.studyGroup))) {
      return { error: "Not authorized" };
    }
  }

  const updatePayload: Record<string, unknown> = {};
  const nextYearOfStudy = scope?.yearOfStudy ?? target.yearOfStudy ?? null;
  const nextStudyGroup = scope?.studyGroup ?? target.studyGroup ?? null;

  if (newRole === "STUDENT") {
    updatePayload.role = "STUDENT";
    updatePayload.studyGroup = null;
    updatePayload.yearOfStudy = null;
  } else if (newRole === "YEAR_LEADER") {
    if (nextYearOfStudy == null) {
      return { error: "Target user must have a yearOfStudy to become a year leader" };
    }
    updatePayload.role = "ADMIN";
    updatePayload.studyGroup = null;
    updatePayload.yearOfStudy = nextYearOfStudy;
  } else if (newRole === "LAB_LEADER") {
    if (!nextStudyGroup) {
      return { error: "Target user must have a studyGroup to become a lab leader" };
    }
    updatePayload.role = "ADMIN";
    updatePayload.studyGroup = nextStudyGroup;
    updatePayload.yearOfStudy = nextYearOfStudy;
  } else {
    updatePayload.role = "ADMIN";
    updatePayload.studyGroup = null;
    updatePayload.yearOfStudy = null;
  }

  const { error } = await supabase.from("User").update(updatePayload).eq("id", targetUserId);
  return { error };
}

export async function updateUserRoleAction(formData: FormData) {
  "use server";

  const targetUserId = String(formData.get("targetUserId") ?? "");
  const newRole = String(formData.get("role") ?? "STUDENT");
  const rawYearOfStudy = formData.get("yearOfStudy");
  const rawStudyGroup = formData.get("studyGroup");

  const yearOfStudy = rawYearOfStudy === null || rawYearOfStudy === "" ? null : Number(rawYearOfStudy);
  const studyGroup = typeof rawStudyGroup === "string" && rawStudyGroup.trim() ? rawStudyGroup.trim() : null;

  const result = await changeUserRole(targetUserId, newRole, { yearOfStudy, studyGroup });

  if (!result.error) {
    revalidatePath("/admin");
    revalidatePath("/dashboard");
    revalidatePath("/settings");
  }

  return result;
}
