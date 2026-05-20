"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function login(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return redirect("/login?error=true&code=" + encodeURIComponent(error.message))
  }

  return redirect("/dashboard")
}

export async function signup(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  
  if (!email.endsWith("@stud.prz.edu.pl")) {
     return redirect("/register?error=true&code=" + encodeURIComponent("Użyj adresu email w domenie stud.prz.edu.pl"))
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    // Brak options.emailRedirectTo do testów - można włączyć potwierdzanie emailu w Supabase Auth Settings.
  })

  if (error) {
    return redirect("/register?error=true&code=" + encodeURIComponent(error.message))
  }

  return redirect("/login?success=registered")
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return redirect("/login")
}
