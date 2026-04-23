"use client";

import { signIn } from "next-auth/react";
import { useState, FormEvent, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import { FileText, Mail, ArrowRight } from "lucide-react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const code = searchParams.get("code");
  const success = searchParams.get("success");
  const verified = searchParams.get("verified");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await signIn("credentials", { email, password, callbackUrl: "/dashboard" });
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.12),_transparent_34%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)]">
      <div className="w-full max-w-md bg-white/85 border border-slate-200/80 rounded-[2rem] shadow-[0_24px_90px_-38px_rgba(15,23,42,0.5)] backdrop-blur p-6 sm:p-10">
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
            <FileText className="h-6 w-6" />
          </span>
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 mb-2">Witaj ponownie</h1>
          <p className="text-slate-500 text-sm">
            Zaloguj się podając e-mail i hasło.
          </p>
        </div>

        {error && !code && (
          <div className="mb-6 p-4 bg-rose-50 text-rose-600 text-sm rounded-2xl border border-rose-200/60 shadow-sm flex items-center gap-3">
            <div className="flex bg-rose-100 p-1.5 rounded-full">
              <Mail className="h-4 w-4" />
            </div>
            <p className="flex-1 font-medium">Błąd logowania. Sprawdź e-mail oraz hasło.</p>
          </div>
        )}

        {code && (
          <div className="mb-6 p-4 bg-amber-50 text-amber-600 text-sm rounded-2xl border border-amber-200/60 shadow-sm flex items-center gap-3">
            <div className="flex bg-amber-100 p-1.5 rounded-full">
              <Mail className="h-4 w-4" />
            </div>
            <p className="flex-1 font-medium">{code}</p>
          </div>
        )}

        {success === "registered" && (
          <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 text-sm rounded-2xl border border-emerald-200/60 shadow-sm flex items-center gap-3">
            <div className="flex bg-emerald-100 p-1.5 rounded-full">
              <Mail className="h-4 w-4" />
            </div>
            <p className="flex-1 font-medium">Konto utworzone! Potwierdź swój adres email, aby się zalogować.</p>
          </div>
        )}

        {verified === "true" && (
          <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 text-sm rounded-2xl border border-emerald-200/60 shadow-sm flex items-center gap-3">
            <div className="flex bg-emerald-100 p-1.5 rounded-full">
              <Mail className="h-4 w-4" />
            </div>
            <p className="flex-1 font-medium">Adres email został potwierdzony. Możesz się teraz zalogować.</p>
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
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Hasło"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white disabled:opacity-60"
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group mt-2 w-full inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3.5 text-sm font-medium text-white shadow-md transition-all hover:bg-slate-800 disabled:opacity-70 disabled:hover:scale-100 hover:-translate-y-0.5"
          >
            {loading ? "Logowanie..." : "Zaloguj się"}
            {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
          </button>
        </form>

        <div className="mt-8 text-center text-sm border-t border-slate-100 pt-6">
          <p className="text-slate-500">
            Jesteś tutaj pierwszy raz?{" "}
            <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
              Zarejestruj konto studenckie
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Ładowanie...</div>}>
      <LoginForm />
    </Suspense>
  );
}
