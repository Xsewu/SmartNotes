"use client";

import { signOut } from "next-auth/react";
import { useDeferredValue, useEffect, useMemo, useState, useRef, useTransition, useOptimistic } from "react";
import {
  Search,
  Share2,
  Users,
  LayoutDashboard,
  UploadCloud,
  FolderOpen,
  LogOut,
  Image as ImageIcon,
  Clock,
  Upload,
  FileUp,
  File,
  FileText,
  X,
  ExternalLink,
  LayoutGrid,
  List
} from "lucide-react";
import { getDashboardFiles, handleShareUser } from "@/app/actions/files";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";

type Category = "Kolokwium" | "Wykład" | "Projekt" | "Inne";
type ViewState = "dashboard" | "my-notes" | "upload";

const shareSchema = z.object({
  email: z
    .string()
    .min(1, "E-mail jest wymagany.")
    .email("Niepoprawny format adresu e-mail.")
    .endsWith("@stud.prz.edu.pl", "Dozwolone są tylko maile w domenie uczelni (@stud.prz.edu.pl)."),
});

type ShareFormValues = z.infer<typeof shareSchema>;

interface Note {
  id: string;
  title: string;
  category: Category;
  tags: string[];
  updatedAt: string;
  pages: number;
  sharedWith: string;
  accent: string;
  url: string;
}

const categories: Array<"Wszystkie" | Category> = ["Wszystkie", "Kolokwium", "Wykład", "Projekt", "Inne"];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } }
};

function NoteRow({
  note,
  onClick,
  onShare,
}: {
  note: Note;
  onClick: () => void;
  onShare: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onClick={onClick}
      className="group w-full flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-white p-3 cursor-pointer transition-colors hover:bg-slate-50"
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${note.accent} text-white shadow-sm`}>
          <FileText className="h-5 w-5 opacity-90" />
        </div>
        
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-sm font-semibold text-slate-900">{note.title}</h4>
            <span className="shrink-0 text-[11px] text-slate-400 font-medium">{note.updatedAt}</span>
            <div className="hidden sm:flex flex-wrap items-center gap-1.5 ml-2">
              <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                {note.category}
              </span>
              {note.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="inline-flex rounded-full bg-slate-50 border border-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500 truncate">
            Udostępniono: {note.sharedWith}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="text-xs font-medium text-slate-600 hidden sm:block whitespace-nowrap">{note.pages} str.</div>
        <button
          onClick={onShare}
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-blue-600 hover:shadow-sm border border-transparent hover:border-slate-200 transition-all focus:outline-none"
          title="Udostępnij"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function StudentNotesDashboard({ user }: { user?: { email?: string | null } }) {
  const [currentView, setCurrentView] = useState<ViewState>("dashboard");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<"Wszystkie" | Category>("Wszystkie");
  
  const [uploadFile, setUploadFile] = useState<globalThis.File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState("Kolokwium");
  const [uploadVisibility, setUploadVisibility] = useState("Prywatny");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [notes, setNotes] = useState<Note[]>([]);
  const [optimisticNotes, addOptimisticNote] = useOptimistic(
    notes,
    (state: Note[], updatedNote: Note) => 
      state.map((note) => (note.id === updatedNote.id ? updatedNote : note))
  );

  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ShareFormValues>({
    resolver: zodResolver(shareSchema),
    defaultValues: { email: "" },
  });

  const deferredQuery = useDeferredValue(query);

  const fetchNotes = async () => {
    try {
      setIsLoading(true);
      const data = await getDashboardFiles();
      setNotes(data as Note[]);
    } catch (error) {
      console.error("Failed to fetch notes", error);
      toast.error("Nie udało się pobrać notatek.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = (data: ShareFormValues) => {
    if (!selectedNote) return;

    const emailToShare = data.email;
    setShareModalOpen(false);
    reset();

    startTransition(async () => {
      // Optymistyczna aktualizacja interfejsu The UI updates instantly!
      const currentSharedWith = selectedNote.sharedWith;
      const optimisticSharedText = currentSharedWith === "PRIVATE" || !currentSharedWith
        ? emailToShare
        : `${currentSharedWith}, ${emailToShare}`;

      const updatedNote = { ...selectedNote, sharedWith: optimisticSharedText };
      addOptimisticNote(updatedNote);
      setSelectedNote(updatedNote); // Dla bocznego panelu (Drawera)

      try {
        await handleShareUser(selectedNote.id, emailToShare);
        toast.success(`Plik został udostępniony dla ${emailToShare}.`);
        await fetchNotes(); // Odśwież prawą prawdę serwerową po udaniu operacji
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Wystąpił błąd.");
        setSelectedNote({ ...selectedNote, sharedWith: currentSharedWith }); // Wycofanie przy błędzie
        setNotes([...notes]);
      }
    });
  };

  useEffect(() => {
    fetchNotes();
  }, [currentView]);

  const filteredNotes = useMemo(() => {
    return optimisticNotes.filter((note) => {
      const categoryMatches = activeCategory === "Wszystkie" || note.category === activeCategory;
      const queryMatches = (note.title + note.category + note.tags.join(" ")).toLowerCase().includes(deferredQuery.toLowerCase());
      return categoryMatches && queryMatches;
    });
  }, [activeCategory, deferredQuery, optimisticNotes]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
      setUploadTitle(e.target.files[0].name.split(".")[0]);
    }
  };

  const handleUploadSubmit = async () => {
    if (!uploadFile) return;
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("title", uploadTitle);
      formData.append("category", uploadCategory);
      formData.append("visibility", uploadVisibility);

      const res = await fetch("/api/files", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Wystąpił błąd podczas przesyłania.");
      }

      const result = await res.json();
      console.log("Uploaded successfully:", result);
      
      setUploadFile(null);
      setUploadTitle("");
      toast.success("Plik został pomyślnie udostępniony!");
      setCurrentView("my-notes");
    } catch (err) {
      console.error(err);
      toast.error("Błąd podczas przesyłania!");
    } finally {
      setIsUploading(false);
    }
  };

  const navItems = [
    { id: "dashboard", label: "Panel główny", icon: LayoutDashboard },
    { id: "my-notes", label: "Przeglądaj notatki", icon: FolderOpen },
    { id: "upload", label: "Dodaj pliki", icon: UploadCloud },
  ] as const;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex h-20 items-center px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <FileText className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">SmartNotes</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 px-4 pt-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-slate-950 text-white shadow-md shadow-slate-950/10"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-500"}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User profile info in sidebar */}
        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 border border-blue-200 text-blue-700 font-bold shadow-sm">
              {user?.email?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 truncate">
              <p className="truncate text-sm font-medium text-slate-950">{user?.email || "Nie zalogowano"}</p>
              <p className="text-xs text-slate-500">Student</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Wyloguj się
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[radial-gradient(circle_at_top_right,_rgba(37,99,235,0.06),_transparent_40%),linear-gradient(180deg,_#f8fafc_0%,_#f1f5f9_100%)]">
        {/* Header (Top bar) */}
        <header className="flex h-20 items-center justify-between border-b border-slate-200/60 bg-white/50 px-6 backdrop-blur-md lg:px-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {navItems.find((i) => i.id === currentView)?.label}
          </h1>
          
          <div className="flex flex-1 items-center justify-end gap-4">
            <div className="relative hidden w-full max-w-sm sm:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (currentView !== "my-notes") setCurrentView("my-notes");
                }}
                placeholder="Szukaj notatek..."
                className="h-10 w-full rounded-full border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>
            {/* Mobile menu could go here */}
          </div>
        </header>

        {/* Body content based on View */}
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          
          {/* VIEW: DASHBOARD */}
          {currentView === "dashboard" && (
            <div className="mx-auto max-w-6xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Welcome Section */}
              <div className="rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-sm sm:p-10 relative overflow-hidden">
                <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-blue-100/50 blur-3xl"></div>
                <div className="relative z-10 max-w-2xl">
                  <h2 className="text-3xl font-bold text-slate-900">Czesc! Masz 12 nowych plików na swoim roku.</h2>
                  <p className="mt-3 text-lg text-slate-600">
                    Studenci z Twojej grupy udostępnili w tym tygodniu przydatne materiały. Zobacz najnowsze skrypty i przykładowe zadania z kolokwiów.
                  </p>
                  <button 
                    onClick={() => setCurrentView('my-notes')}
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-700 hover:-translate-y-0.5"
                  >
                    <FolderOpen className="h-4 w-4" />
                    Zbadaj materiały
                  </button>
                </div>
              </div>

              {/* Stats Section */}
              <div>
                <h3 className="mb-4 hidden text-lg font-semibold text-slate-900 sm:block">Podsumowanie Twojego konta</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-sm font-medium text-slate-600">Udostępnione pliki</span>
                      <UploadCloud className="h-5 w-5" />
                    </div>
                    <span className="mt-4 block text-3xl font-bold text-slate-900">8</span>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-sm font-medium text-slate-600">Pobrane materiały</span>
                      <FileUp className="h-5 w-5" />
                    </div>
                    <span className="mt-4 block text-3xl font-bold text-slate-900">42</span>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-sm font-medium text-slate-600">Aktywność w grupie</span>
                      <Users className="h-5 w-5" />
                    </div>
                    <span className="mt-4 block text-3xl font-bold text-slate-900">Wysoka</span>
                  </div>
                </div>
              </div>

              {/* Ostatnio przeglądane - Kafelki/Grid */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">Ostatnio dodane pliki w sieci</h3>
                  <button onClick={() => setCurrentView('my-notes')} className="text-sm font-medium text-blue-600 hover:text-blue-700">Pokaż wszystko &rarr;</button>
                </div>
                
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {optimisticNotes.slice(0, 4).map(note => (
                    <div 
                      key={note.id} 
                      onClick={() => setSelectedNote(note)}
                      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:border-slate-300"
                    >
                      {/* Generowany miniaturowy podgląd - Grid z obrazkiem */}
                      <div className={`h-36 w-full bg-gradient-to-br ${note.accent} p-4 flex flex-col justify-between opacity-90 transition-opacity group-hover:opacity-100`}>
                        <div className="flex justify-end">
                           <span className="inline-flex rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white shadow-sm backdrop-blur-md">
                             {note.category}
                           </span>
                        </div>
                        <ImageIcon className="h-8 w-8 text-white/50" />
                      </div>
                      
                      <div className="flex flex-1 flex-col p-4">
                        <h4 className="line-clamp-2 text-base font-semibold leading-snug text-slate-900">{note.title}</h4>
                        <div className="mt-auto pt-4 flex flex-wrap gap-1">
                           {note.tags.slice(0, 2).map((tag) => (
                             <span key={tag} className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                               {tag}
                             </span>
                           ))}
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {note.updatedAt}</span>
                          <span className="font-semibold text-slate-700">{note.pages} str.</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: MY NOTES */}
          {currentView === "my-notes" && (
             <div className="mx-auto max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className={`rounded-full border px-5 py-2.5 text-sm font-medium transition-all ${
                          activeCategory === category
                            ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>

                  <div className="flex rounded-lg bg-slate-100 p-1 shadow-sm border border-slate-200">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`flex items-center justify-center rounded-md p-2 transition-all ${
                        viewMode === 'grid' 
                          ? 'bg-slate-950 text-white shadow-md' 
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`flex items-center justify-center rounded-md p-2 transition-all ${
                        viewMode === 'list' 
                          ? 'bg-slate-950 text-white shadow-md' 
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className={viewMode === 'grid' ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-stretch" : "flex flex-col gap-3"}>
                  {isLoading ? (
                    viewMode === 'grid' ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="h-[280px] w-full animate-pulse rounded-2xl border border-slate-200 bg-white">
                        <div className="h-36 rounded-t-2xl bg-slate-100"></div>
                        <div className="p-4 space-y-3">
                          <div className="h-4 w-3/4 rounded bg-slate-100"></div>
                          <div className="h-4 w-1/2 rounded bg-slate-100"></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-20 w-full animate-pulse rounded-xl border border-slate-200 bg-white p-4 flex items-center gap-4">
                        <div className="h-12 w-12 rounded bg-slate-100 shrink-0"></div>
                        <div className="space-y-2 flex-1">
                          <div className="h-4 w-1/3 rounded bg-slate-100"></div>
                          <div className="h-3 w-1/4 rounded bg-slate-100"></div>
                        </div>
                      </div>
                    ))
                  )
                ) : filteredNotes.length === 0 ? (
                  <div className="col-span-full rounded-[2rem] border border-dashed border-slate-300 p-12 text-center">
                      <Search className="mx-auto h-10 w-10 text-slate-300" />
                      <h3 className="mt-4 text-lg font-semibold text-slate-900">Brak wyników</h3>
                      <p className="text-slate-500">Nie znaleźliśmy notatek pasujących do tego zapytania.</p>
                    </div>
                  ) : (
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={viewMode}
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className={`col-span-full ${viewMode === 'grid' ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-stretch" : "flex flex-col gap-3 w-full"}`}
                      >
                        {filteredNotes.map(note => (
                          <motion.div
                            key={note.id}
                            variants={itemVariants}
                            className="w-full"
                          >
                            {viewMode === 'grid' ? (
                              <div 
                                onClick={() => setSelectedNote(note)}
                                className="group h-full relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:border-slate-300"
                              >
                                {/* Podgląd / Zdjęcie */}
                                <div className={`h-36 w-full bg-gradient-to-br ${note.accent} p-4 flex flex-col justify-between opacity-90 transition-opacity group-hover:opacity-100`}>
                                  <div className="flex justify-between">
                                     <span className="inline-flex rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white shadow-sm backdrop-blur-md">
                                       {note.category}
                                     </span>
                                     <button className="rounded-full bg-white/20 p-1.5 text-white opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100 hover:bg-white/40 shadow-sm">
                                       <Share2 className="h-3 w-3" />
                                     </button>
                                  </div>
                                  <ImageIcon className="h-8 w-8 text-white/50" />
                                </div>
                                
                                <div className="flex flex-1 flex-col p-4">
                                  <h4 className="line-clamp-2 text-base font-semibold leading-snug text-slate-900">{note.title}</h4>
                                  
                                  <div className="mt-2 text-xs text-slate-500">Udostępniono dla: <span className="font-semibold text-slate-700">{note.sharedWith}</span></div>

                                  <div className="mt-auto pt-4 flex flex-wrap gap-1">
                                     {note.tags.map((tag) => (
                                       <span key={tag} className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                                         {tag}
                                       </span>
                                     ))}
                                  </div>
                                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {note.updatedAt}</span>
                                    <span className="font-semibold text-slate-700">{note.pages} str.</span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <NoteRow 
                                note={note}
                                onClick={() => setSelectedNote(note)}
                                onShare={(e) => {
                                  e.stopPropagation();
                                  setSelectedNote(note);
                                  setShareModalOpen(true);
                                }}
                              />
                            )}
                          </motion.div>
                        ))}
                      </motion.div>
                    </AnimatePresence>
                  )}
                </div>
             </div>
          )}

          {/* VIEW: UPLOAD */}
          {currentView === "upload" && (
             <div className="mx-auto max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
                 <h2 className="text-2xl font-bold text-slate-900">Udostępnij nowy dokument</h2>
                 <p className="mt-2 text-slate-500">Prześlij notatki, skrypty lub zadania w formacie PDF i zdjęć, by podzielić się nimi ze znajomymi.</p>
                 
                 <div className="mt-8 space-y-6">
                   {/* Pole pliku */}
                   <div>
                     <label className="mb-2 block text-sm font-medium text-slate-700">Wybierz plik do przesłania</label>
                     <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,image/*,.docx" />
                     
                     <div 
                       onClick={handleUploadClick}
                       className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
                         uploadFile ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100"
                       }`}
                     >
                       {uploadFile ? (
                         <>
                           <File className="mb-3 h-10 w-10 text-blue-600" />
                           <p className="text-sm font-medium text-blue-900">{uploadFile.name}</p>
                           <p className="mt-1 text-xs text-blue-600/80">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                           <button className="mt-4 rounded-full bg-blue-100 px-4 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-200">Zmień plik</button>
                         </>
                       ) : (
                         <>
                           <UploadCloud className="mb-3 h-10 w-10 text-slate-400" />
                           <p className="text-sm font-medium text-slate-700">Kliknij aby wybrać, lub przeciągnij plik tutaj.</p>
                           <p className="mt-1 text-xs text-slate-500">Akceptowane formaty: PDF, JPG, PNG, DOCX (do 50MB).</p>
                         </>
                       )}
                     </div>
                   </div>

                   {/* Formularz dla pliku */}
                   {uploadFile && (
                     <div className="animate-in fade-in slide-in-from-top-4 space-y-5 rounded-2xl border border-slate-200 p-5 bg-slate-50/50">
                       <div>
                         <label className="mb-1.5 block text-sm font-medium text-slate-700">Tytuł materiału</label>
                         <input 
                           type="text" 
                           value={uploadTitle}
                           onChange={(e) => setUploadTitle(e.target.value)}
                           className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                         />
                       </div>
                       
                       <div className="grid grid-cols-2 gap-5">
                         <div>
                           <label className="mb-1.5 block text-sm font-medium text-slate-700">Kategoria</label>
                           <select 
                             value={uploadCategory}
                             onChange={(e) => setUploadCategory(e.target.value)}
                             className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                           >
                             <option value="Kolokwium">Kolokwium</option>
                             <option value="Wykład">Wykład</option>
                             <option value="Projekt">Projekt</option>
                             <option value="Inne">Inne</option>
                           </select>
                         </div>
                         <div>
                           <label className="mb-1.5 block text-sm font-medium text-slate-700">Udostępnij dla</label>
                           <select 
                             value={uploadVisibility}
                             onChange={(e) => setUploadVisibility(e.target.value)}
                             className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                           >
                             <option value="Prywatny">Prywatny</option>
                             <option value="Moja Grupa">Moja Grupa</option>
                             <option value="Cały Rocznik">Cały Rocznik</option>
                           </select>
                         </div>
                       </div>
                       
                       <div className="pt-2">
                         <button 
                           onClick={handleUploadSubmit}
                           disabled={isUploading}
                           className="w-full flex justify-center items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:bg-slate-800 shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                         >
                           <Upload className="h-4 w-4" />
                           {isUploading ? "Przesyłanie..." : "Rozpocznij udostępnianie"}
                         </button>
                       </div>
                     </div>
                   )}
                 </div>
               </div>
             </div>
          )}

        </div>
      </main>

      {/* File Preview Drawer */}
      {selectedNote && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setSelectedNote(null)} 
          />
          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-3xl transform border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out sm:w-[500px] md:w-[700px] flex flex-col">
            
            {/* Drawer Header */}
            <div className="flex h-20 items-center justify-between border-b border-slate-100 px-6">
              <div className="flex flex-col overflow-hidden">
                <h2 className="truncate text-lg font-semibold text-slate-900">{selectedNote.title}</h2>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>Dodano: {selectedNote.updatedAt}</span>
                  <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                  <span className="font-medium text-blue-600">{selectedNote.category}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <a 
                  href={selectedNote.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  title="Otwórz w nowej karcie"
                >
                  <ExternalLink className="h-5 w-5" />
                </a>
                <button 
                  onClick={() => setSelectedNote(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-hidden bg-slate-100/50 p-2 sm:p-6">
              <div className="h-full w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white">
                <iframe 
                  src={`${selectedNote.url}#toolbar=0`} 
                  className="w-full h-full border-none"
                  title={selectedNote.title}
                />
              </div>
            </div>

              {/* Drawer Footer Details */}
            <div className="border-t border-slate-100 bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    <div className="h-8 w-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-xs font-bold text-blue-700">SR</div>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-slate-900">Udostępnione dla:</p>
                    <p className="text-slate-500 max-w-xs truncate" title={selectedNote.sharedWith}>{selectedNote.sharedWith}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setShareModalOpen(true)}
                    className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-slate-900/10 hover:bg-slate-800 transition"
                  >
                    <Users className="h-4 w-4" />
                    Zaproś email
                  </button>
                </div>
              </div>
              
              <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                {selectedNote.tags.map((tag) => (
                  <span key={tag} className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

          </div>

          {/* Modal do udostępniania plików (Krok w Drawerze otwiera go) */}
          {shareModalOpen && selectedNote && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl relative">
                <button
                  onClick={() => setShareModalOpen(false)}
                  className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition"
                >
                  <X className="h-5 w-5" />
                </button>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Zapisz uprawnienia</h3>
                <p className="text-sm text-slate-500 mb-6">Zaproś konkretną osobę z Twojego roku dodając jej email z domeny studenckiej.</p>
                
                <form onSubmit={handleSubmit(handleShare)}>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Adres email studenta:
                  </label>
                  <input
                    type="email"
                    {...register("email")}
                    placeholder="np. 123456@stud.prz.edu.pl"
                    className={`w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 transition-all mb-1 ${
                      errors.email
                        ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                        : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                    }`}
                  />
                  {errors.email && (
                    <p className="text-xs text-red-500 mb-6">{errors.email.message}</p>
                  )}
                  {!errors.email && <div className="mb-6"></div>}
                  
                  <div className="flex gap-3 justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => setShareModalOpen(false)}
                      className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
                      disabled={isPending}
                    >
                      Anuluj
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPending ? <Clock className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                      Udostępnij wpis
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}