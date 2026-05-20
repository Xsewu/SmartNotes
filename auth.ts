import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function createSupabaseServerClient(cookieStore: Awaited<ReturnType<typeof cookies>>, key: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://brak-kluczy.supabase.co";

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Ignorujemy błędy podczas próby ustawienia ciasteczek w Server Components
        }
      },
    },
  });
}

// Tworzenie serwerowego klienta Supabase
export async function createClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) console.warn("⚠️ UWAGA: Brak zmiennych w .env! Aplikacja awaryjnie działa w trybie niezalogowanym.");

  return createSupabaseServerClient(cookieStore, key || "brak-kluczy");
}

// Wrapper symulujący działanie auth() dla API
export async function auth() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
    return null; // Zapobiega crashowi całej aplikacji i zwraca po prostu "niezalogowany"
  }

  const cookieStore = await cookies();
  const preferredKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "brak-kluczy";
  const fallbackKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const preferredClient = createSupabaseServerClient(cookieStore, preferredKey);
  const { data: { user } } = await preferredClient.auth.getUser();

  if (user) {
    // Also fetch custom User row (image, profile fields) from our Postgres table
    try {
      const admin = getSupabaseAdminClient();
      const { data: userRow } = await admin
        .from("User")
        .select("image,role,studentIndex,studyGroup,yearOfStudy")
        .eq("id", user.id)
        .single();

      const effectiveRole =
        userRow?.role === "ADMIN"
          ? userRow?.studyGroup
            ? "LAB_LEADER"
            : userRow?.yearOfStudy != null
              ? "YEAR_LEADER"
              : "ADMIN"
          : userRow?.role ?? undefined;

      return {
        user: {
          id: user.id,
          email: user.email,
          image: userRow?.image ?? null,
          role: effectiveRole,
          baseRole: userRow?.role ?? undefined,
          studentIndex: userRow?.studentIndex ?? undefined,
          studyGroup: userRow?.studyGroup ?? undefined,
          yearOfStudy: userRow?.yearOfStudy ?? undefined,
        },
      };
    } catch {
      return {
        user: {
          id: user.id,
          email: user.email,
        },
      };
    }
  }

  if (fallbackKey && fallbackKey !== preferredKey) {
    const fallbackClient = createSupabaseServerClient(cookieStore, fallbackKey);
    const { data: { user: fallbackUser } } = await fallbackClient.auth.getUser();

    if (fallbackUser) {
      return {
        user: {
          id: fallbackUser.id,
          email: fallbackUser.email,
        },
      };
    }
  }
  
  return null;
}

// Wrapper dla wylogowywania
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
