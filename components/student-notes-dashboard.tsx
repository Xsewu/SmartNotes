"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Check,
  ChevronDown,
  FileText,
  Filter,
  Search,
  Share2,
  Shield,
  Sparkles,
  Tag,
  Users,
  X,
} from "lucide-react";

type Category = "Kolokwium" | "Wykład" | "Projekt";

type ShareScope = "Prywatny" | "Osoba" | "Grupa" | "Rok";

interface Note {
  id: number;
  title: string;
  category: Category;
  tags: string[];
  updatedAt: string;
  pages: number;
  sharedWith: string;
  accent: string;
}

interface ShareOption {
  value: ShareScope;
  label: string;
  description: string;
}

interface StatItem {
  label: string;
  value: string;
  icon: typeof FileText;
}

const categories: Array<"Wszystkie" | Category> = ["Wszystkie", "Kolokwium", "Wykład", "Projekt"];

const shareOptions: ShareOption[] = [
  {
    value: "Prywatny",
    label: "Prywatny",
    description: "Widoczny tylko dla Ciebie.",
  },
  {
    value: "Osoba",
    label: "Jedna osoba",
    description: "Wyślij plik do konkretnego studenta.",
  },
  {
    value: "Grupa",
    label: "Grupa",
    description: "Udostępnij materiał całej grupie zajęciowej.",
  },
  {
    value: "Rok",
    label: "Cały rok",
    description: "Pokaż plik wszystkim osobom z roku.",
  },
];

const notes: Note[] = [
  {
    id: 1,
    title: "Algorytmy i struktury danych - zestaw 4",
    category: "Kolokwium",
    tags: ["#egzamin", "#kolejki", "#lists"],
    updatedAt: "Dzisiaj, 08:40",
    pages: 12,
    sharedWith: "Rok 2, grupa A",
    accent: "from-sky-500 to-cyan-400",
  },
  {
    id: 2,
    title: "Projekt zaliczeniowy - opis API i backlog",
    category: "Projekt",
    tags: ["#ideas", "#backend", "#team"],
    updatedAt: "Wczoraj, 21:15",
    pages: 7,
    sharedWith: "Jedna osoba",
    accent: "from-violet-500 to-fuchsia-400",
  },
  {
    id: 3,
    title: "Grafika komputerowa - omówienie pipeline",
    category: "Wykład",
    tags: ["#rendering", "#wykład", "#pdf"],
    updatedAt: "3 dni temu",
    pages: 18,
    sharedWith: "Grupa labowa",
    accent: "from-emerald-500 to-teal-400",
  },
  {
    id: 4,
    title: "Bazy danych - pytania na kolokwium",
    category: "Kolokwium",
    tags: ["#sql", "#normalizacja", "#egzamin"],
    updatedAt: "5 dni temu",
    pages: 9,
    sharedWith: "Rok 1",
    accent: "from-amber-500 to-orange-400",
  },
  {
    id: 5,
    title: "Wstęp do UX - notatki z wykładu 2",
    category: "Wykład",
    tags: ["#ui", "#notion", "#notatki"],
    updatedAt: "1 tydzień temu",
    pages: 11,
    sharedWith: "Prywatny",
    accent: "from-rose-500 to-pink-400",
  },
  {
    id: 6,
    title: "Laboratorium z sieci - protokół z ćwiczeń",
    category: "Projekt",
    tags: ["#report", "#wifi", "#upload"],
    updatedAt: "2 tygodnie temu",
    pages: 6,
    sharedWith: "Rok 3",
    accent: "from-indigo-500 to-blue-400",
  },
];

const stats: StatItem[] = [
  { label: "Pliki w bazie", value: "128", icon: FileText },
  { label: "Udostępnione dziś", value: "24", icon: Share2 },
  { label: "Weryfikacja mailowa", value: "ON", icon: Shield },
];

function matchesQuery(note: Note, query: string) {
  if (!query) {
    return true;
  }

  const normalizedQuery = query.toLowerCase();
  const searchableText = [note.title, note.category, note.sharedWith, ...note.tags].join(" ").toLowerCase();

  return searchableText.includes(normalizedQuery);
}

function StatCard({ stat }: { stat: StatItem }) {
  const Icon = stat.icon;

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur transition-transform duration-200 hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
          <Icon className="h-4 w-4" />
        </span>
        <span>{stat.label}</span>
      </div>
      <div className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">{stat.value}</div>
    </div>
  );
}

function CategoryChip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 ${
        active
          ? "border-slate-950 bg-slate-950 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
      <div className="h-28 animate-pulse bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100" />
      <div className="space-y-4 p-5">
        <div className="h-5 w-2/3 animate-pulse rounded-full bg-slate-100" />
        <div className="h-4 w-1/2 animate-pulse rounded-full bg-slate-100" />
        <div className="flex gap-2">
          <div className="h-8 w-20 animate-pulse rounded-full bg-slate-100" />
          <div className="h-8 w-24 animate-pulse rounded-full bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

function NoteCard({ note, onShare }: { note: Note; onShare: (note: Note) => void }) {
  return (
    <article className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
      <div className={`h-28 bg-gradient-to-br ${note.accent} p-5 text-white`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/90">
              {note.category}
            </div>
            <h3 className="mt-4 text-lg font-semibold tracking-tight text-white">{note.title}</h3>
          </div>
          <div className="rounded-2xl bg-white/15 p-2 opacity-80 transition-opacity group-hover:opacity-100">
            <Sparkles className="h-4 w-4" />
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="flex items-center justify-between text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            <span>{note.updatedAt}</span>
          </div>
          <span>{note.pages} stron</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {note.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
            >
              <Tag className="h-3 w-3" />
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span>{note.sharedWith}</span>
          <button
            type="button"
            onClick={() => onShare(note)}
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition-transform duration-200 hover:-translate-y-0.5 hover:bg-slate-800"
          >
            <Share2 className="h-4 w-4" />
            Udostępnij
          </button>
        </div>
      </div>
    </article>
  );
}

function ShareDialog({
  note,
  selectedScope,
  onSelectScope,
  onClose,
}: {
  note: Note | null;
  selectedScope: ShareScope;
  onSelectScope: (scope: ShareScope) => void;
  onClose: () => void;
}) {
  if (!note) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
          <div>
            <p className="text-sm font-medium text-slate-500">Udostępnianie pliku</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">{note.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-950"
            aria-label="Zamknij modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {shareOptions.map((option) => {
              const active = selectedScope === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onSelectScope(option.value)}
                  className={`rounded-3xl border p-4 text-left transition-all duration-200 ${
                    active
                      ? "border-slate-950 bg-slate-950 text-white shadow-lg"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{option.label}</span>
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                        active ? "border-white/30 bg-white/10" : "border-slate-300 bg-white"
                      }`}
                    >
                      {active ? <Check className="h-3.5 w-3.5" /> : null}
                    </span>
                  </div>
                  <p className={`mt-2 text-sm ${active ? "text-slate-300" : "text-slate-500"}`}>
                    {option.description}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
            Aktualny wybór: <span className="font-semibold text-slate-950">{selectedScope}</span>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Anuluj
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              Zapisz uprawnienia
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StudentNotesDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<"Wszystkie" | Category>("Wszystkie");
  const [openNoteId, setOpenNoteId] = useState<number | null>(null);
  const [selectedScope, setSelectedScope] = useState<ShareScope>("Rok");
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsLoading(false);
    }, 900);

    return () => window.clearTimeout(timer);
  }, []);

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const categoryMatches = activeCategory === "Wszystkie" || note.category === activeCategory;
      const queryMatches = matchesQuery(note, deferredQuery);

      return categoryMatches && queryMatches;
    });
  }, [activeCategory, deferredQuery]);

  const openNote = notes.find((note) => note.id === openNoteId) ?? null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.12),_transparent_34%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-6 text-slate-950 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-[2rem] border border-slate-200/80 bg-white/85 p-5 shadow-[0_24px_90px_-38px_rgba(15,23,42,0.5)] backdrop-blur sm:p-6 lg:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                <Sparkles className="h-3.5 w-3.5" />
                Student notes dashboard
              </span>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  Notatki, pliki i udostępnianie w jednym miejscu.
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                  Szybkie filtrowanie po kategorii, wyszukiwarka po tytule i tagach,
                  oraz modal do nadawania uprawnień zgodnie ze stylem nowoczesnych paneli.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
              {stats.map((stat) => (
                <StatCard key={stat.label} stat={stat} />
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-7">
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">Twoje pliki</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {filteredNotes.length} wynik{filteredNotes.length === 1 ? "" : "i"} dla bieżącego filtra.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500">
                <Filter className="h-4 w-4" />
                Filtrowanie
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <label className="relative block">
                <span className="sr-only">Szukaj notatek</span>
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Szukaj po tytule, tagu lub opisie..."
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <CategoryChip
                    key={category}
                    active={activeCategory === category}
                    onClick={() => setActiveCategory(category)}
                  >
                    {category}
                  </CategoryChip>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {isLoading
                ? Array.from({ length: 6 }).map((_, index) => <SkeletonCard key={index} />)
                : filteredNotes.map((note) => (
                    <NoteCard key={note.id} note={note} onShare={(item) => setOpenNoteId(item.id)} />
                  ))}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-lg sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-300">Status konta</p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-tight">Weryfikacja aktywna</h3>
                </div>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-emerald-300">
                  <Shield className="h-5 w-5" />
                </span>
              </div>

              <div className="mt-6 space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                <div className="flex items-center justify-between gap-4">
                  <span>Mail uczelniany</span>
                  <span className="font-semibold text-white">&lt;indeks&gt;@stud.prz.edu.pl</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Prefiks doktorancki</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-300">
                    <X className="h-3.5 w-3.5" />
                    zablokowany
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Grupa i rok</span>
                  <span className="font-semibold text-white">edytowalne po rejestracji</span>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Dostęp do materiałów</p>
                  <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
                    Rocznik, grupa albo osoba
                  </h3>
                </div>
                <Users className="h-5 w-5 text-slate-500" />
              </div>

              <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
                <li className="rounded-2xl bg-slate-50 px-4 py-3">Pliki widoczne dla własnego roku trafiają do dashboardu.</li>
                <li className="rounded-2xl bg-slate-50 px-4 py-3">Udostępnianie działa per użytkownik, grupa lub cały rocznik.</li>
                <li className="rounded-2xl bg-slate-50 px-4 py-3">Wspierane są PDF-y, obrazy i dalsze rozszerzenia formatów.</li>
              </ul>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <ChevronDown className="h-4 w-4" />
                Szybkie tagi
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {["#eliak", "#ideas", "#egzamin", "#pdf", "#ui"].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </div>

      <ShareDialog
        note={openNote}
        selectedScope={selectedScope}
        onSelectScope={setSelectedScope}
        onClose={() => setOpenNoteId(null)}
      />
    </main>
  );
}
