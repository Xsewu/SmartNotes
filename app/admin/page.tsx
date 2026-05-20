import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getManagedMembers, getEffectiveRole } from "@/app/actions/admin";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { ShieldAlert, Users, FileText, Layers, ShieldCheck, ArrowLeft, Search } from "lucide-react";
import AdminUserRow from "@/components/AdminUserRow";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { q: query } = await searchParams;

  const effectiveRole = await getEffectiveRole(session.user as any);

  // Podstawowa ochrona przed nieuprawnionym wejściem
  if (effectiveRole === "STUDENT" || !effectiveRole) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center dark:bg-slate-950">
        <div className="rounded-full bg-rose-100 p-4 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
          <ShieldAlert className="h-12 w-12" />
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Brak dostępu</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">Nie masz uprawnień do przeglądania tej strony.</p>
        <Link href="/dashboard" className="mt-8 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200">
          Wróć do panelu
        </Link>
      </div>
    );
  }

  // Pobieramy dane z obsługą błędów i gwarancją tablicy
  const response = await getManagedMembers(query);
  const fetchError = response?.error;

  // Ponieważ getEffectiveRole jest teraz asynchroniczne, musimy przygotować role przed renderowaniem JSX
  const rawMembers = Array.isArray(response?.data) ? response.data : [];
  const members = await Promise.all(rawMembers.map(async (member) => ({
    ...member,
    calculatedRole: await getEffectiveRole(member)
  })));

  let usersCount = 0;
  let filesCount = 0;
  let decksCount = 0;
  let subjectsCount = 0;

  if (effectiveRole === "ADMIN") {
    [usersCount, filesCount, decksCount, subjectsCount] = await Promise.all([
      prisma.user.count(),
      prisma.file.count(),
      prisma.flashcardDeck.count(),
      prisma.subject.count(),
    ]);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 p-6 lg:p-12 font-sans">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Górny Nagłówek */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Centrum Dowodzenia</h1>
            <p className="text-slate-500 mt-1 dark:text-slate-400">Zarządzaj użytkownikami i monitoruj statystyki systemu.</p>
          </div>
          <Link href="/dashboard" className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 transition dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800">
            <ArrowLeft className="h-4 w-4" /> Wróć do aplikacji
          </Link>
        </div>

        {/* Zaawansowane Statystyki */}
        {effectiveRole === "ADMIN" && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Wszyscy Użytkownicy</p>
                <p className="text-2xl font-bold">{usersCount}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Wgrane Notatki</p>
                <p className="text-2xl font-bold">{filesCount}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
                <Layers className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Wygenerowane Fiszek</p>
                <p className="text-2xl font-bold">{decksCount}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Dostępnych Przedmiotów</p>
                <p className="text-2xl font-bold">{subjectsCount}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabela Użytkowników */}
        <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 bg-slate-50/50 px-6 py-5 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Zarządzanie uprawnieniami</h2>
                <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Zmieniaj role oraz przypisuj studentów do ich grup i roczników.</p>
              </div>
              <form className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="q"
                  defaultValue={query || ""}
                  placeholder="Szukaj po emailu..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </form>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50/80 text-xs uppercase text-slate-500 dark:bg-slate-950/50 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-semibold tracking-wider">Adres Email</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Obecna Rola</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Zmień Rolę i Przypisanie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {members?.map((member) => (
                  <AdminUserRow 
                    key={member.id} 
                    member={member as any} 
                    isSuperAdmin={effectiveRole === "ADMIN"} 
                  />
                ))}
                
                {(!members || members.length === 0) && (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                      Brak użytkowników do zarządzania w twoim zakresie uprawnień.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
