import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Aktualizuje sesję Supabase dla każdego zapytania i zabezpiecza trasy
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Ignoruj pliki wewnętrzne Next.js i pliki statyczne:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - obrazy (svg, png, jpg, jpeg, gif, webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};