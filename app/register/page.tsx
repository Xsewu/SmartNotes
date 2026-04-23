"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GraduationCap, Mail, Users, User, ArrowRight, AlertCircle, Lock } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState("1");
  const [studyGroup, setStudyGroup] = useState("");
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          yearOfStudy: parseInt(yearOfStudy, 10),
          studyGroup,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Wystąpił nieznany błąd podczas rejestracji.");
      }

      // Successful registration
      router.push("/login?success=registered");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || "Błąd komunikacji z serwerem.");
      } else {
        setError("Błąd komunikacji z serwerem.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.12),_transparent_34%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)]">
      <div className="w-full max-w-lg bg-white/85 border border-slate-200/80 rounded-[2rem] shadow-[0_24px_90px_-38px_rgba(15,23,42,0.5)] backdrop-blur p-6 sm:p-10">
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
            <GraduationCap className="h-6 w-6" />
          </span>
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 mb-2">Rejestracja dla studentów</h1>
          <p className="text-slate-500 text-sm">
            Utwórz konto w <span className="font-semibold text-slate-700">SmartNotes</span> podając swój uniwersytecki e-mail PRz oraz dane o grupie.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 text-rose-600 text-sm rounded-2xl border border-rose-200/60 shadow-sm flex items-center gap-3">
             <div className="flex bg-rose-100 p-1.5 rounded-full">
              <AlertCircle className="h-4 w-4" />
            </div>
            <p className="flex-1 font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2 ml-1">
              Adres e-mail <span className="text-slate-400 font-normal">(w domenie stud.prz.edu.pl)</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="np. 123456@stud.prz.edu.pl"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white disabled:opacity-60"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2 ml-1">
              Hasło
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 znaków"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white disabled:opacity-60"
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="yearOfStudy" className="block text-sm font-medium text-slate-700 mb-2 ml-1">
                Rok studiów
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="yearOfStudy"
                  type="number"
                  min="1"
                  max="6"
                  required
                  value={yearOfStudy}
                  onChange={(e) => setYearOfStudy(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white disabled:opacity-60"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="studyGroup" className="block text-sm font-medium text-slate-700 mb-2 ml-1">
                Grupa / Kod grupy
              </label>
              <div className="relative">
                <Users className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="studyGroup"
                  type="text"
                  required
                  value={studyGroup}
                  onChange={(e) => setStudyGroup(e.target.value)}
                  placeholder="np. IN21 lub D4"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white disabled:opacity-60"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group mt-4 w-full inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3.5 text-sm font-medium text-white shadow-md transition-all hover:bg-slate-800 disabled:opacity-70 disabled:hover:scale-100 hover:-translate-y-0.5"
          >
            {loading ? "Rejestrowanie..." : "Załóż konto"}
            {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
          </button>
        </form>

        <div className="mt-8 text-center text-sm border-t border-slate-100 pt-6">
          <p className="text-slate-500">
            Masz już założone konto?{" "}
            <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
              Zaloguj się
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
