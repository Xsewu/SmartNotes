"use client";

import { useState, useTransition } from "react";
import { Lock, ArrowLeft, Loader2, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { changePassword } from "@/app/actions/settings";
import { useRouter } from "next/navigation";

export default function SettingsForm({ user }: { user: any }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      const res = await changePassword(formData);
      if (res?.error) {
        toast.error(res.error);
      } else if (res?.success) {
        toast.success("Hasło zostało pomyślnie zmienione!");
        (e.target as HTMLFormElement).reset();
        router.refresh();
      }
    });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Ustawienia konta</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Zarządzaj swoim profilem i bezpieczeństwem.</p>
        </div>
        <Link
          href="/dashboard"
          className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm border border-slate-200 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Wróć
        </Link>
      </div>

      <div className="space-y-6">
        {/* Profil Section */}
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-6 mb-6 dark:border-slate-800">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold border border-blue-200 dark:border-blue-900 dark:bg-blue-900/40 dark:text-blue-300">
              {user?.email?.[0]?.toUpperCase() || "U"}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Profil głównego konta</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Rola</label>
              <div className="flex w-full items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                <UserIcon className="mr-2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                {user?.role === "ADMIN" ? "Administrator" : "Student"}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Numer indeksu</label>
              <div className="flex w-full items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                {user?.studentIndex || "Brak informacji"}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Grupa</label>
              <div className="flex w-full items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                {user?.studyGroup || "Brak informacji"}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Rok studiów</label>
              <div className="flex w-full items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                {user?.yearOfStudy || "Brak informacji"}
              </div>
            </div>
          </div>
        </section>

        {/* Change Password Section */}
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-6 flex items-center gap-2">
            <Lock className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Zmiana hasła</h2>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Obecne hasło</label>
              <input
                type="password"
                name="currentPassword"
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-400/50"
                placeholder="Wpisz obecne hasło"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Nowe hasło</label>
              <input
                type="password"
                name="newPassword"
                required
                minLength={6}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-400/50"
                placeholder="Minimum 6 znaków"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Potwierdź nowe hasło</label>
              <input
                type="password"
                name="confirmPassword"
                required
                minLength={6}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-400/50"
                placeholder="Powtórz nowe hasło"
              />
            </div>
            
            <div className="pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:bg-slate-800 shadow-md disabled:opacity-70 disabled:cursor-not-allowed dark:bg-blue-600 dark:hover:bg-blue-700 dark:shadow-blue-900/20"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
                Zaktualizuj hasło
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
