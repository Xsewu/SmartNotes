import Image from "next/image";
import Link from "next/link";
import { Users, Search, ShieldCheck, ArrowRight, FileText, CheckCircle2, Zap } from "lucide-react";
import { auth, signOut } from "@/auth";

export default async function LandingPage() {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-xl transition-all">
        <div className="mx-auto flex h-28 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl bg-white shadow-[0_8px_30px_rgba(37,99,235,0.15)] ring-1 ring-slate-200/50">
              <Image src="/logo.png" alt="SmartNotes Logo" width={200} height={200} priority className="h-full w-full object-cover scale-[1.4] translate-y-2" />
            </div>
            <span className="text-4xl font-extrabold tracking-tight text-slate-950">Smart<span className="text-blue-600">Notes</span></span>
          </div>

          <nav className="flex items-center gap-2 sm:gap-4">
            {session?.user ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-lg">
                    {session.user.email?.[0].toUpperCase()}
                  </div>
                </div>
                <Link
                  href="/dashboard"
                  className="hidden rounded-full border border-slate-200 bg-white/50 px-5 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-100 hover:text-slate-900 shadow-sm sm:block"
                >
                  Moje Notatki
                </Link>
                <form action={async () => {
                  "use server"
                  await signOut();
                }}>
                  <button type="submit" className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-lg">
                    Wyloguj
                  </button>
                </form>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden rounded-full border border-slate-200 bg-white/50 px-5 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-100 hover:text-slate-900 shadow-sm sm:block"
                >
                  Zaloguj się
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-blue-500/25 hover:shadow-lg"
                >
                  Załóż konto
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden pt-20 pb-28 md:pt-32 md:pb-40">
          {/* Tło - Abstrakcyjne kształty */}
          <div className="absolute left-1/2 top-0 -z-10 -translate-x-1/2 blur-3xl xl:-top-6 mix-blend-multiply">
            <div className="aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-blue-200 via-blue-100 to-indigo-200 opacity-60 rounded-full" />
          </div>

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center md:text-left">
            <div className="grid gap-16 lg:grid-cols-2 lg:gap-8 items-center">
              <div className="max-w-2xl mx-auto lg:mx-0">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700 ring-1 ring-inset ring-blue-700/10 mb-6">
                  <Zap className="h-3.5 w-3.5 flex-shrink-0" />
                  Dla studentów Politechniki Rzeszowskiej
                </span>
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-slate-900 mb-6 leading-[1.1]">
                  Wszystkie notatki z Twojego roku w <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">jednym miejscu.</span>
                </h1>
                <p className="mt-4 text-lg leading-8 text-slate-600 mb-10">
                  Ekskluzywna platforma wymiany wiedzy tylko dla zweryfikowanych studentów PRZ. Przygotuj się do sesji szybciej, prościej i w pełnej współpracy z grupą.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4">
                  {session?.user ? (
                    <Link
                      href="/dashboard"
                      className="group inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-slate-900 px-7 py-4 text-base font-medium text-white shadow-lg transition-all hover:bg-slate-800 hover:shadow-xl hover:-translate-y-0.5"
                    >
                      Przejdź do notatek
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                  ) : (
                    <Link
                      href="/register"
                      className="group inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-slate-900 px-7 py-4 text-base font-medium text-white shadow-lg transition-all hover:bg-slate-800 hover:shadow-xl hover:-translate-y-0.5"
                    >
                      Dołącz do grupy
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                  )}
                  <Link
                    href="#features"
                    className="inline-flex w-full sm:w-auto items-center justify-center rounded-full bg-white px-7 py-4 text-base font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 transition-all hover:bg-slate-50 hover:text-slate-900"
                  >
                    Jak to działa?
                  </Link>
                </div>
                
                {/* Social Proof */}
                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4 border-t border-slate-200/60 pt-8">
                  <div className="flex -space-x-3">
                    <div className="h-10 w-10 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-500">M</div>
                    <div className="h-10 w-10 rounded-full border-2 border-white bg-indigo-100 flex items-center justify-center text-xs font-medium text-indigo-500">A</div>
                    <div className="h-10 w-10 rounded-full border-2 border-white bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-500">P</div>
                  </div>
                  <div className="text-sm text-slate-500 text-center sm:text-left">
                    <p>Zaufało nam już <span className="font-semibold text-slate-900">500+ studentów</span></p>
                    <p>z różnych wydziałów PRz.</p>
                  </div>
                </div>
              </div>

              {/* Prawa strona graficzna */}
              <div className="relative mx-auto mt-16 lg:mt-0 w-full max-w-lg lg:max-w-none perspective-1000">
                <div className="relative rounded-3xl bg-slate-950 p-2 shadow-[0_20px_60px_-15px_rgba(37,99,235,0.4)] ring-1 ring-gray-900/10 transform lg:-rotate-y-1 lg:rotate-x-1 transition-transform duration-500 hover:rotate-0">
                  <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-b from-blue-500 to-indigo-600 opacity-25 blur-md"></div>
                  
                  {/* Floating Element 1 - PDF */}
                  <div className="absolute -left-8 -top-8 z-10 hidden md:flex animate-[bounce_5s_infinite] items-center gap-3 rounded-2xl border border-white/20 bg-white/10 p-3 pr-5 shadow-2xl backdrop-blur-md">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-white">Kolokwium_Bazy.pdf</p>
                      <p className="text-xs text-slate-300">Udostępniono grupie</p>
                    </div>
                  </div>
                  
                  {/* Floating Element 2 - Uploaded */}
                  <div className="absolute -right-8 -bottom-8 z-10 hidden md:flex animate-[bounce_6s_infinite_1s] items-center gap-3 rounded-2xl border border-white/20 bg-white/10 p-3 pr-5 shadow-2xl backdrop-blur-md">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-white">Zestaw zadań #4</p>
                      <p className="text-xs text-slate-300">Pomyślnie zgrano</p>
                    </div>
                  </div>

                  <div className="relative rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 ring-1 ring-white/10 px-6 py-16 flex flex-col items-center justify-center text-center aspect-[4/3] overflow-hidden">
                    {/* Deco grid */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
                    
                    <div className="relative z-10 h-24 w-24 rounded-[2rem] bg-blue-600/20 flex flex-col items-center justify-center border border-blue-500/30 mb-8 shadow-[0_0_50px_-10px_rgba(37,99,235,0.6)]">
                      <Users className="h-12 w-12 text-blue-400" />
                    </div>
                    <p className="relative z-10 text-white font-semibold text-2xl tracking-tight">Kierunek: Informatyka</p>
                    <div className="relative z-10 mt-3 inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1.5 text-sm text-slate-300 border border-white/10">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      12 nowych materiałów od wczoraj
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="bg-white py-24 sm:py-32 border-t border-slate-100">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-sm font-bold tracking-widest uppercase leading-7 text-blue-600">Rozwiązania</h2>
              <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Wszystko czego potrzebujesz, aby <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">przetrwać studia</span>
              </p>
            </div>
            
            <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
              <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-3">
                {/* Feature 1 */}
                <div className="group flex flex-col bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 relative overflow-hidden">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <dt className="flex items-center gap-x-4 text-lg font-bold leading-7 text-slate-900">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                      <Users className="h-7 w-7" />
                    </div>
                    Zorganizowane w Grupy
                  </dt>
                  <dd className="mt-5 flex flex-auto flex-col text-base leading-7 text-slate-600">
                    <p className="flex-auto">Otrzymujesz dostęp do plików domyślnie połączonych ze swoim rokiem i kierunkiem. Udostępnianie jednym kliknięciem dla całej Twojej grupy dziekańskiej.</p>
                  </dd>
                </div>

                {/* Feature 2 */}
                <div className="group flex flex-col bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 relative overflow-hidden">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 to-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <dt className="flex items-center gap-x-4 text-lg font-bold leading-7 text-slate-900">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                      <Search className="h-7 w-7" />
                    </div>
                    Inteligentne Wyszukiwanie
                  </dt>
                  <dd className="mt-5 flex flex-auto flex-col text-base leading-7 text-slate-600">
                    <p className="flex-auto">Rozbudowany system tagów, klasyfikacji oraz filtrów. Ekspresowo znajdź konkretne kolokwium czy sprawozdania z laboratoriów tuż przed dedlajnem.</p>
                  </dd>
                </div>

                {/* Feature 3 */}
                <div className="group flex flex-col bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-1 relative overflow-hidden">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <dt className="flex items-center gap-x-4 text-lg font-bold leading-7 text-slate-900">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                      <ShieldCheck className="h-7 w-7" />
                    </div>
                    Bezpieczeństwo E-mail
                  </dt>
                  <dd className="mt-5 flex flex-auto flex-col text-base leading-7 text-slate-600">
                    <p className="flex-auto">Rejestracja jest zablokowana tylko dla adresów kończących się na <span className="font-semibold text-slate-800">@stud.prz.edu.pl</span>. Wyłączony dostęp dla doktorantów. W zamkniętym gronie.</p>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </section>
        
        {/* CTA Bottom Section */}
        <section className="relative isolate overflow-hidden bg-slate-950 px-6 py-24 text-center sm:px-16 sm:py-32">
          <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Nie odkładaj nauki na ostatnią chwilę.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-300">
            Zarejestruj darmowe konto, odblokuj dostęp do materiałów swojego rocznika i po prostu zdaj te studia.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/register"
              className="rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-100 transition-all hover:scale-105"
            >
              Załóż konto i odbierz materiały
            </Link>
          </div>
          <svg viewBox="0 0 1024 1024" className="absolute left-1/2 top-1/2 -z-10 h-[64rem] w-[64rem] -translate-x-1/2 [mask-image:radial-gradient(closest-side,white,transparent)]" aria-hidden="true">
            <circle cx="512" cy="512" r="512" fill="url(#gradient-bg)" fillOpacity="0.15" />
            <defs>
              <radialGradient id="gradient-bg">
                <stop stopColor="#3b82f6" />
                <stop offset="1" stopColor="#1e3a8a" />
              </radialGradient>
            </defs>
          </svg>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200 mt-auto py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-3 mb-6 md:mb-0 grayscale opacity-80 transition-all hover:grayscale-0 hover:opacity-100">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/50">
               <Image src="/logo.png" alt="SmartNotes Logo" width={160} height={160} className="h-full w-full object-cover scale-[1.4] translate-y-1.5" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-950">Smart<span className="text-blue-600">Notes</span></span>
          </div>
          <p className="text-sm text-slate-500 font-medium">
            &copy; 2026 SmartNotes. Stworzone przez studentów dla studentów.
          </p>
        </div>
      </footer>
    </div>
  );
}
