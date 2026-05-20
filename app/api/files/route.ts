import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// Leniwa inicjalizacja klienta Supabase
const getSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error("Brak kluczy Supabase w środowisku (env).");
  return createClient(supabaseUrl, supabaseKey);
};

export async function POST(request: NextRequest) {
  try {
    // 1. Sprawdzenie sesji (NextAuth)
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Nieautoryzowany dostęp" }, { status: 401 });
    }

    // 2. Odczytanie danych z formularza
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const category = formData.get("category") as string;
    const visibilityInput = formData.get("visibility") as string;
    const subjectIdInput = formData.get("subjectId") as string;

    if (!file) {
      return NextResponse.json({ error: "Brak pliku" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdminClient();

    const { data: user, error: userError } = await supabaseAdmin
      .from("User")
      .upsert(
        {
          id: session.user.id,
          email: session.user.email?.toLowerCase() ?? session.user.id,
            updatedAt: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .select("id, email")
      .single();

    if (userError || !user) {
      console.error("User sync error:", userError);
      return NextResponse.json({ error: "Nie udało się zsynchronizować użytkownika" }, { status: 500 });
    }

    // 4. Wgrywanie pliku do Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const fileExt = file.name.split('.').pop() || "unknown";
    // Generowanie unikalnej nazwy pliku aby uniknąć nadpisywania
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    const supabase = getSupabase();

    const { error: storageError } = await supabase.storage
      .from("uploads")
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (storageError) {
      console.error("Supabase Storage Error:", storageError);
      return NextResponse.json({ error: "Błąd podczas wgrywania pliku do Storage" }, { status: 500 });
    }

    // 5. Pobranie publicznego URL wgranego pliku
    const { data: { publicUrl } } = supabase.storage.from("uploads").getPublicUrl(fileName);

    // 6. Mapowanie wartości widoczności dla typu ENUM "Visibility" z Prismy
      const visibilityMap: Record<string, "PRIVATE" | "DIRECT" | "GROUP" | "YEAR"> = {
        PRIVATE: "PRIVATE",
        DIRECT: "DIRECT",
        GROUP: "GROUP",
        YEAR: "YEAR",
        Prywatny: "PRIVATE",
        "Wybrani użytkownicy": "DIRECT",
        "Moja Grupa": "GROUP",
        "Cały Rocznik": "YEAR",
      };

      const visibility = visibilityMap[visibilityInput] ?? "PRIVATE";

    // 7. Zapisanie metadanych do bazy przez Supabase
    const { data: newFile, error: fileError } = await supabaseAdmin
      .from("File")
      .insert({
        id: randomUUID(),
        title: title || file.name,
        url: publicUrl,
        format: fileExt,
        visibility,
        authorId: user.id,
        subjectId: subjectIdInput ? parseInt(subjectIdInput, 10) : null,
      })
      .select("id, title, url, format, visibility, createdAt, pages, authorId, subjectId")
      .single();

    if (fileError || !newFile) {
      console.error("File insert error:", fileError);
      return NextResponse.json({ error: "Błąd podczas zapisu metadanych pliku" }, { status: 500 });
    }

    // 8. Dodanie kategorii (Tag) do bazy danych
    if (category) {
      const { data: tag, error: tagError } = await supabaseAdmin
        .from("Tag")
        .upsert({ name: category }, { onConflict: "name" })
        .select("id, name")
        .single();

      if (tagError || !tag) {
        console.error("Tag upsert error:", tagError);
        return NextResponse.json({ error: "Błąd podczas zapisu tagu" }, { status: 500 });
      }

      const { error: fileTagError } = await supabaseAdmin.from("FileTag").upsert(
        { fileId: newFile.id, tagId: tag.id },
        { onConflict: "fileId,tagId" }
      );

      if (fileTagError) {
        console.error("FileTag insert error:", fileTagError);
        return NextResponse.json({ error: "Błąd podczas zapisu kategorii pliku" }, { status: 500 });
      }
    }

    // 9. Wymuszenie odświeżenia widoku u klienta
    revalidatePath("/dashboard");

    return NextResponse.json({ success: true, file: newFile });
  } catch (error) {
    console.error("Upload handler error:", error);
    return NextResponse.json({ error: "Wystąpił błąd po stronie serwera" }, { status: 500 });
  }
}