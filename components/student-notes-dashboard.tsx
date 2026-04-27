"use client";

import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { useDeferredValue, useEffect, useMemo, useState, useRef, useTransition, useOptimistic, startTransition } from "react";
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
  List,
  Bookmark,
  Star,
  MessageSquare,
  Send,
  MoreVertical
} from "lucide-react";
import { getSubjects } from "@/app/actions/subjects";
import { getDashboardFiles, handleShareUser, toggleFavorite, rateFile, getFileComments, addComment, getUserStats } from "@/app/actions/files";
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
  subject: string | null;
  subjectId: number | null;
  tags: string[];
  updatedAt: string;
  pages: number;
  sharedWith: string;
  accent: string;
  url: string;
  isFavorite: boolean;
  favoritesCount: number;
  commentsCount: number;
  rating: number;
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
      className="group w-full flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-white p-3 cursor-pointer transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/80"
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${note.accent} text-white shadow-sm relative`}>
          <FileText className="h-5 w-5 opacity-90" />
          {note.isFavorite && (
             <div className="absolute -top-1 -right-1 bg-yellow-400 text-white rounded-full p-0.5 shadow-sm">
                <Bookmark className="h-2.5 w-2.5 fill-current" />
             </div>
          )}
        </div>
        
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{note.title}</h4>
            <span className="shrink-0 text-[11px] text-slate-400 font-medium dark:text-slate-500">{note.updatedAt}</span>
            
            <div className="hidden md:flex items-center gap-1 text-[11px] font-medium text-yellow-600 dark:text-yellow-500 ml-1">
              <Star className="h-3 w-3 fill-current" />
              {note.rating > 0 ? note.rating : "—"}
            </div>

            <div className="hidden sm:flex flex-wrap items-center gap-1.5 ml-2">
              <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {note.category}
              </span>
              {note.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="inline-flex rounded-full bg-slate-50 border border-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-[11px] text-slate-500 truncate dark:text-slate-400">
            <span>Udostępniono: {note.sharedWith}</span>
            <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {note.commentsCount}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="text-xs font-medium text-slate-600 hidden sm:block whitespace-nowrap dark:text-slate-400">{note.pages} str.</div>
        <button
          onClick={onShare}
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-blue-600 hover:shadow-sm border border-transparent hover:border-slate-200 transition-all focus:outline-none dark:text-slate-500 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-blue-400"
          title="Udostępnij"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

import { ThemeToggle } from "@/components/theme-toggle";

export default function StudentNotesDashboard({ user }: { user?: { email?: string | null, image?: string | null } }) {
  const [currentView, setCurrentView] = useState<ViewState>("dashboard");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<"Wszystkie" | Category>("Wszystkie");
  
  const [subjects, setSubjects] = useState<{ id: number; name: string }[]>([]);
  const [activeSubject, setActiveSubject] = useState<number | "Wszystkie">("Wszystkie");

  const [uploadFile, setUploadFile] = useState<globalThis.File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState("Kolokwium");
  const [uploadSubjectId, setUploadSubjectId] = useState("");
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  // Nowe stany do obsługi ocen i komentarzy w Drawerze
  const [drawerTab, setDrawerTab] = useState<"document" | "discussion">("document");
  const [comments, setComments] = useState<{ id: string; content: string; authorEmail: string; authorImage: string | null; createdAt: string; isAuthor: boolean }[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  
  const [userStats, setUserStats] = useState({ uploaded: 0, saved: 0, activity: "Brak", newFiles: 0 });

  // Funkcja ładująca komentarze gdy otwieramy plik
  useEffect(() => {
    if (selectedNote && drawerTab === "discussion") {
      setIsLoadingComments(true);
      getFileComments(selectedNote.id)
        .then((data) => setComments(data))
        .catch(() => toast.error("Nie udało się załadować komentarzy."))
        .finally(() => setIsLoadingComments(false));
    }
  }, [selectedNote, drawerTab]);

  const handleToggleFavorite = async () => {
    if (!selectedNote) return;
    
    // Optimistic update
    const previousState = selectedNote.isFavorite;
    const previousCount = selectedNote.favoritesCount;
    
    const updatedNote = { 
      ...selectedNote, 
      isFavorite: !previousState, 
      favoritesCount: previousState ? previousCount - 1 : previousCount + 1 
    };
    
    startTransition(() => {
      addOptimisticNote(updatedNote);
    });
    setSelectedNote(updatedNote);

    try {
      const res = await toggleFavorite(selectedNote.id);
      // Ensure sync
      if (res.isFavorite !== updatedNote.isFavorite) {
        throw new Error("Sync mismatch");
      }
    } catch {
      toast.error("Nie udało się zaktualizować ulubionych.");
      const reverted = { ...selectedNote, isFavorite: previousState, favoritesCount: previousCount };
      startTransition(() => {
        addOptimisticNote(reverted);
      });
      setSelectedNote(reverted);
    }
  };

  const handleRate = async (value: number) => {
    if (!selectedNote) return;
    
    try {
      await rateFile(selectedNote.id, value);
      toast.success(`Oceniono na ${value} gwiazdki!`);
      // Zamiast optimistycznego wyliczenia, moglibyśmy odświeżyć wszystkie notatki
      fetchNotes();
      
      const newNote = { ...selectedNote, rating: value };
      startTransition(() => {
        addOptimisticNote(newNote);
      });
      setSelectedNote(newNote);
    } catch {
      toast.error("Błąd podczas oceniania.");
    }
  };

  const handlePostComment = async () => {
    if (!selectedNote || !newComment.trim()) return;
    setIsSubmittingComment(true);
    try {
      await addComment(selectedNote.id, newComment);
      setNewComment("");
      toast.success("Dodano komentarz!");
      
      const updatedNote = { ...selectedNote, commentsCount: selectedNote.commentsCount + 1 };
      startTransition(() => {
        addOptimisticNote(updatedNote);
      });
      setSelectedNote(updatedNote);

      const data = await getFileComments(selectedNote.id);
      setComments(data);
    } catch {
      toast.error("Nie udało się dodać komentarza.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userMenuOpen &&
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node) &&
        headerMenuRef.current &&
        !headerMenuRef.current.contains(event.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuOpen]);

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
      const stats = await getUserStats();
      setUserStats(stats);
      const subjs = await getSubjects();
      setSubjects(subjs);
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
      const subjectMatches = activeSubject === "Wszystkie" || note.subjectId === activeSubject;
      const queryMatches = (note.title + note.category + note.tags.join(" ") + (note.subject || "")).toLowerCase().includes(deferredQuery.toLowerCase());
      return categoryMatches && subjectMatches && queryMatches;
    });
  }, [activeCategory, activeSubject, deferredQuery, optimisticNotes]);

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
      if (uploadSubjectId) formData.append("subjectId", uploadSubjectId);

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
      setUploadSubjectId("");
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
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50 font-sans">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 md:flex shrink-0">
        <div className="flex h-20 items-center px-6 shrink-0">
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-[0_4px_15px_rgba(37,99,235,0.15)] ring-1 ring-slate-200/50 dark:bg-slate-800 dark:ring-slate-700/50">
              <Image src="/logo.png" alt="SmartNotes Logo" width={80} height={80} priority className="h-full w-full object-contain p-1" />
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
                    ? "bg-slate-950 text-white shadow-md shadow-slate-950/10 dark:bg-slate-800"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-500 dark:text-slate-400"}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User profile info in sidebar */}
        <div className="border-t border-slate-200 dark:border-slate-800 p-4 relative" ref={userMenuRef}>
          <button 
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-full text-left flex items-center gap-3 rounded-xl hover:bg-slate-50 p-2 transition-colors dark:hover:bg-slate-800"
          >
            {user?.image ? (
              <img src={user.image} alt="Avatar" className="h-10 w-10 rounded-full object-cover shadow-sm border border-slate-200 dark:border-slate-700" />
            ) : (
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 border border-blue-200 text-blue-700 font-bold shadow-sm dark:bg-blue-900/50 dark:border-blue-800 dark:text-blue-400">
                {user?.email?.[0]?.toUpperCase() || "U"}
              </div>
            )}
            <div className="flex-1 truncate">
              <p className="truncate text-sm font-medium text-slate-950 dark:text-slate-200">{user?.email || "Nie zalogowano"}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Student</p>
            </div>
          </button>
          
          {userMenuOpen && (
            <div className="absolute bottom-full left-4 right-4 mb-2 rounded-xl border border-slate-200 bg-white p-2 shadow-xl animate-in fade-in slide-in-from-bottom-2 dark:border-slate-700 dark:bg-slate-800">
              <div className="px-3 py-2 border-b border-slate-100 mb-2 dark:border-slate-700">
                <p className="text-sm font-medium text-slate-900 truncate dark:text-slate-200">{user?.email}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Konto studenckie</p>
              </div>
              <Link
                href="/settings"
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 mb-1 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                onClick={() => setUserMenuOpen(false)}
              >
                <Users className="h-4 w-4" />
                Ustawienia
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors dark:text-rose-400 dark:hover:bg-rose-950/20"
              >
                <LogOut className="h-4 w-4" />
                Wyloguj się
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[radial-gradient(circle_at_top_right,_rgba(37,99,235,0.06),_transparent_40%),linear-gradient(180deg,_#f8fafc_0%,_#f1f5f9_100%)] dark:bg-[radial-gradient(circle_at_top_right,_rgba(37,99,235,0.1),_transparent_40%),linear-gradient(180deg,_#0f172a_0%,_#020617_100%)]">
        {/* Header (Top bar) */}
        <header className="flex h-20 items-center justify-between border-b border-slate-200/60 bg-white/50 px-6 backdrop-blur-md lg:px-8 dark:border-slate-800/60 dark:bg-slate-900/50">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
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
            
            <ThemeToggle />

            {/* Mobile / Tablet user profile button */}
            <div className="relative md:hidden" ref={headerMenuRef}>
              <button 
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 border border-blue-200 text-blue-700 font-bold shadow-sm overflow-hidden"
              >
                {user?.image ? (
                  <img src={user.image} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  user?.email?.[0]?.toUpperCase() || "U"
                )}
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-2 border-b border-slate-100 mb-2">
                    <p className="text-sm font-medium text-slate-900 truncate">{user?.email}</p>
                  </div>
                  <Link
                    href="/settings"
                    className="w-full flex items-center gap-2 rounded-lg px-3 py-2 mb-1 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Users className="h-4 w-4" />
                    Ustawienia
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Wyloguj się
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Body content based on View */}
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          
          {/* VIEW: DASHBOARD */}
          {currentView === "dashboard" && (
            <div className="mx-auto max-w-6xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Welcome Section */}
              <div className="rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-sm sm:p-10 relative overflow-hidden dark:border-slate-800/80 dark:bg-slate-900">
                <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-blue-100/50 blur-3xl dark:bg-blue-900/20"></div>
                <div className="relative z-10 max-w-2xl">
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    Cześć! Masz {userStats.newFiles} {userStats.newFiles === 1 ? 'nowy plik' : (userStats.newFiles >= 2 && userStats.newFiles <= 4 ? 'nowe pliki' : 'nowych plików')} na swoim roku.
                  </h2>
                  <p className="mt-3 text-lg text-slate-600 dark:text-slate-400">
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
                <h3 className="mb-4 hidden text-lg font-semibold text-slate-900 dark:text-slate-100 sm:block">Podsumowanie Twojego konta</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Udostępnione pliki</span>
                      <UploadCloud className="h-5 w-5" />
                    </div>
                    <span className="mt-4 block text-3xl font-bold text-slate-900 dark:text-slate-100">{userStats.uploaded}</span>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Zapisane materiały</span>
                      <FileUp className="h-5 w-5" />
                    </div>
                    <span className="mt-4 block text-3xl font-bold text-slate-900 dark:text-slate-100">{userStats.saved}</span>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Aktywność w grupie</span>
                      <Users className="h-5 w-5" />
                    </div>
                    <span className="mt-4 block text-3xl font-bold text-slate-900 dark:text-slate-100">{userStats.activity}</span>
                  </div>
                </div>
              </div>

              {/* Ostatnio przeglądane - Kafelki/Grid */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Ostatnio dodane pliki w sieci</h3>
                  <button onClick={() => setCurrentView('my-notes')} className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">Pokaż wszystko &rarr;</button>
                </div>
                
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {optimisticNotes.slice(0, 4).map(note => (
                    <div 
                      key={note.id} 
                      onClick={() => setSelectedNote(note)}
                      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
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
                      
                      <div className="flex flex-1 flex-col p-4 dark:border-t-slate-800">
                        <h4 className="line-clamp-2 text-base font-semibold leading-snug text-slate-900 dark:text-slate-100">{note.title}</h4>
                        <div className="mt-auto pt-4 flex items-center justify-between">
                           <div className="flex flex-wrap gap-1">
                             {note.tags.slice(0, 2).map((tag) => (
                               <span key={tag} className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                 {tag}
                               </span>
                             ))}
                           </div>
                           <div className="flex items-center gap-2 text-xs font-semibold">
                             <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-500">
                               <Star className="h-3 w-3 fill-current" />
                               {note.rating > 0 ? note.rating : "—"}
                             </div>
                             <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                               <MessageSquare className="h-3 w-3" />
                               {note.commentsCount}
                             </div>
                           </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {note.updatedAt}</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{note.pages} str.</span>
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
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex flex-wrap gap-2">
                      {categories.map((category) => (
                        <button
                          key={category}
                          onClick={() => setActiveCategory(category)}
                          className={`rounded-full border px-5 py-2.5 text-sm font-medium transition-all ${
                            activeCategory === category
                              ? "border-slate-950 bg-slate-950 text-white shadow-sm dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700"
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                    
                    <select
                      value={activeSubject}
                      onChange={(e) => setActiveSubject(e.target.value === "Wszystkie" ? "Wszystkie" : Number(e.target.value))}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition-all hover:border-slate-300 focus:border-slate-950 focus:ring-1 focus:ring-slate-950 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:focus:border-slate-100 dark:focus:ring-slate-100"
                    >
                      <option value="Wszystkie">Wszystkie przedmioty</option>
                      {subjects.map((subj) => (
                        <option key={subj.id} value={subj.id}>{subj.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex rounded-lg bg-slate-100 p-1 shadow-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`flex items-center justify-center rounded-md p-2 transition-all ${
                        viewMode === 'grid' 
                          ? 'bg-slate-950 text-white shadow-md dark:bg-slate-700 dark:text-slate-100' 
                          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                      }`}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`flex items-center justify-center rounded-md p-2 transition-all ${
                        viewMode === 'list' 
                          ? 'bg-slate-950 text-white shadow-md dark:bg-slate-700 dark:text-slate-100' 
                          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
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
                      <div key={i} className="h-[280px] w-full animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                        <div className="h-36 rounded-t-2xl bg-slate-100 dark:bg-slate-800"></div>
                        <div className="p-4 space-y-3">
                          <div className="h-4 w-3/4 rounded bg-slate-100 dark:bg-slate-800"></div>
                          <div className="h-4 w-1/2 rounded bg-slate-100 dark:bg-slate-800"></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-20 w-full animate-pulse rounded-xl border border-slate-200 bg-white p-4 flex items-center gap-4 dark:border-slate-800 dark:bg-slate-900">
                        <div className="h-12 w-12 rounded bg-slate-100 shrink-0 dark:bg-slate-800"></div>
                        <div className="space-y-2 flex-1">
                          <div className="h-4 w-1/3 rounded bg-slate-100 dark:bg-slate-800"></div>
                          <div className="h-3 w-1/4 rounded bg-slate-100 dark:bg-slate-800"></div>
                        </div>
                      </div>
                    ))
                  )
                ) : filteredNotes.length === 0 ? (
                  <div className="col-span-full rounded-[2rem] border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
                      <Search className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
                      <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Brak wyników</h3>
                      <p className="text-slate-500 dark:text-slate-400">Nie znaleźliśmy notatek pasujących do tego zapytania.</p>
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
                            // @ts-ignore
                            variants={itemVariants}
                            className="w-full"
                          >
                            {viewMode === 'grid' ? (
                              <div 
                                onClick={() => setSelectedNote(note)}
                                className="group h-full relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
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
                                
                                <div className="flex flex-1 flex-col p-4 dark:border-t-slate-800">
                                  <h4 className="line-clamp-2 text-base font-semibold leading-snug text-slate-900 dark:text-slate-100">{note.title}</h4>
                                  
                                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">Udostępniono dla: <span className="font-semibold text-slate-700 dark:text-slate-300">{note.sharedWith}</span></div>

                                  <div className="mt-auto pt-4 flex items-center justify-between">
                                     <div className="flex flex-wrap gap-1">
                                       {note.tags.slice(0, 2).map((tag) => (
                                         <span key={tag} className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                           {tag}
                                         </span>
                                       ))}
                                     </div>
                                     <div className="flex items-center gap-2 text-xs font-semibold">
                                       {note.isFavorite && <Bookmark className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />}
                                       <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-500">
                                         <Star className="h-3 w-3 fill-current" />
                                         {note.rating > 0 ? note.rating : "—"}
                                       </div>
                                       <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                         <MessageSquare className="h-3 w-3" />
                                         {note.commentsCount}
                                       </div>
                                     </div>
                                  </div>
                                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {note.updatedAt}</span>
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">{note.pages} str.</span>
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
               <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-10 dark:border-slate-800 dark:bg-slate-900">
                 <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Udostępnij nowy dokument</h2>
                 <p className="mt-2 text-slate-500 dark:text-slate-400">Prześlij notatki, skrypty lub zadania w formacie PDF i zdjęć, by podzielić się nimi ze znajomymi.</p>
                 
                 <div className="mt-8 space-y-6">
                   {/* Pole pliku */}
                   <div>
                     <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Wybierz plik do przesłania</label>
                     <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,image/*,.docx" />
                     
                     <div 
                       onClick={handleUploadClick}
                       className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
                         uploadFile ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20" : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 dark:hover:bg-slate-800/80"
                       }`}
                     >
                       {uploadFile ? (
                         <>
                           <File className="mb-3 h-10 w-10 text-blue-600 dark:text-blue-400" />
                           <p className="text-sm font-medium text-blue-900 dark:text-blue-100">{uploadFile.name}</p>
                           <p className="mt-1 text-xs text-blue-600/80 dark:text-blue-400/80">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                           <button className="mt-4 rounded-full bg-blue-100 px-4 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60">Zmień plik</button>
                         </>
                       ) : (
                         <>
                           <UploadCloud className="mb-3 h-10 w-10 text-slate-400 dark:text-slate-500" />
                           <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Kliknij aby wybrać, lub przeciągnij plik tutaj.</p>
                           <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Akceptowane formaty: PDF, JPG, PNG, DOCX (do 50MB).</p>
                         </>
                       )}
                     </div>
                   </div>

                   {/* Formularz dla pliku */}
                   {uploadFile && (
                     <div className="animate-in fade-in slide-in-from-top-4 space-y-5 rounded-2xl border border-slate-200 p-5 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
                       <div>
                         <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Tytuł materiału</label>
                         <input 
                           type="text" 
                           value={uploadTitle}
                           onChange={(e) => setUploadTitle(e.target.value)}
                           className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-400" 
                         />
                       </div>
                       
                       <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                         <div>
                           <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Kategoria</label>
                           <select 
                             value={uploadCategory}
                             onChange={(e) => setUploadCategory(e.target.value)}
                             className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-400"
                           >
                             <option value="Kolokwium">Kolokwium</option>
                             <option value="Wykład">Wykład</option>
                             <option value="Projekt">Projekt</option>
                             <option value="Inne">Inne</option>
                           </select>
                         </div>
                         <div>
                           <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Przedmiot</label>
                           <select 
                             value={uploadSubjectId}
                             onChange={(e) => setUploadSubjectId(e.target.value)}
                             className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-400"
                           >
                             <option value="">Wybierz przedmiot...</option>
                             {subjects.map((subj) => (
                               <option key={subj.id} value={subj.id}>{subj.name}</option>
                             ))}
                           </select>
                         </div>
                         <div>
                           <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Udostępnij dla</label>
                           <select 
                             value={uploadVisibility}
                             onChange={(e) => setUploadVisibility(e.target.value)}
                             className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-400"
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
                           className="w-full flex justify-center items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:bg-slate-800 shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700"
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
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity dark:bg-slate-900/60" 
            onClick={() => setSelectedNote(null)} 
          />
          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-3xl transform border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out sm:w-[500px] md:w-[700px] flex flex-col dark:border-slate-800 dark:bg-slate-900">
            
            {/* Drawer Header */}
            <div className="flex h-20 shrink-0 items-center justify-between border-b border-slate-100 px-6 dark:border-slate-800">
              <div className="flex flex-col overflow-hidden w-full max-w-sm">
                <h2 className="truncate text-lg font-semibold text-slate-900 dark:text-slate-100">{selectedNote.title}</h2>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>Dodano: {selectedNote.updatedAt}</span>
                  <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">{selectedNote.category}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4 shrink-0">
                <button
                  onClick={handleToggleFavorite}
                  className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                    selectedNote.isFavorite 
                      ? "text-yellow-500 bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-500/10 dark:hover:bg-yellow-500/20" 
                      : "text-slate-400 hover:bg-slate-100 dark:text-slate-500 dark:hover:bg-slate-800"
                  }`}
                  title={selectedNote.isFavorite ? "Usuń z zapisanych" : "Zapisz do ulubionych"}
                >
                  <Bookmark className={`h-5 w-5 ${selectedNote.isFavorite ? "fill-current" : ""}`} />
                </button>
                <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>
                <a 
                  href={selectedNote.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  title="Otwórz w nowej karcie"
                >
                  <ExternalLink className="h-5 w-5" />
                </a>
                <button 
                  onClick={() => setSelectedNote(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Drawer Tabs */}
            <div className="flex justify-center gap-2 py-3 bg-white border-b border-slate-100 dark:bg-slate-900 dark:border-slate-800 shrink-0">
                <button
                   onClick={() => setDrawerTab("document")}
                   className={`px-5 py-2 text-sm font-medium rounded-full transition-colors ${
                     drawerTab === "document" 
                       ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" 
                       : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                   }`}
                >Dokument PDF</button>
                <button
                   onClick={() => setDrawerTab("discussion")}
                   className={`px-5 py-2 text-sm font-medium rounded-full transition-colors flex items-center gap-2 ${
                     drawerTab === "discussion" 
                       ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" 
                       : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                   }`}
                >
                  Komentarze i oceny 
                  <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] items-center justify-center ${drawerTab === 'discussion' ? 'bg-white/20' : 'bg-slate-300/50 dark:bg-slate-700'}`}>{selectedNote.commentsCount}</span>
                </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-hidden bg-slate-100/50 flex flex-col p-0 sm:p-4 dark:bg-slate-900/50">
              {drawerTab === "document" ? (
                <div className="h-full w-full sm:rounded-xl overflow-hidden border-0 sm:border border-slate-200 shadow-sm bg-white dark:border-slate-700 dark:bg-slate-900">
                  <iframe 
                    src={`${selectedNote.url}#toolbar=0`} 
                    className="w-full h-full border-none bg-white dark:bg-slate-900"
                    title={selectedNote.title}
                  />
                </div>
              ) : (
                <div className="flex flex-col h-full bg-white sm:rounded-xl border-y sm:border-x border-slate-200 shadow-sm overflow-hidden dark:border-slate-700 dark:bg-slate-900">
                  <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-3">
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest">Oceń materiał</h3>
                    <div className="flex items-center gap-2">
                       {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => handleRate(star)}
                            className="group relative h-10 w-10 hover:-translate-y-1 transition-transform"
                          >
                            <Star className={`h-8 w-8 mx-auto ${(selectedNote.rating || 0) >= star ? "fill-yellow-400 text-yellow-400" : "fill-slate-100 text-slate-300 dark:fill-slate-800 dark:text-slate-700 group-hover:fill-yellow-200 group-hover:text-yellow-300 dark:group-hover:fill-yellow-500/20 dark:group-hover:text-yellow-600"}`} />
                          </button>
                       ))}
                       <div className="ml-3 text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedNote.rating > 0 ? `${selectedNote.rating} / 5` : "Brak ocen"}</div>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-5 pb-20 scroll-smooth space-y-5">
                    {isLoadingComments ? (
                       <div className="flex justify-center py-10 opacity-50"><Clock className="h-6 w-6 animate-spin text-slate-400" /></div>
                    ) : comments.length === 0 ? (
                       <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                          <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-20" />
                          <p className="text-sm">Nikt jeszcze nie skomentował tej notatki.</p>
                          <p className="text-xs mt-1">Bądź pierwszy!</p>
                       </div>
                    ) : (
                       comments.map((comment) => (
                          <div key={comment.id} className={`flex gap-3 ${comment.isAuthor ? "flex-row-reverse" : "flex-row"}`}>
                            {comment.authorImage ? (
                               <img src={comment.authorImage} alt="" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full object-cover border border-slate-200 shadow-sm dark:border-slate-800" />
                            ) : (
                               <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900/50 dark:text-blue-400">
                                  {comment.authorEmail[0].toUpperCase()}
                               </div>
                            )}
                            <div className={`flex flex-col max-w-[75%] ${comment.isAuthor ? "items-end" : "items-start"}`}>
                               <div className="text-[11px] text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1.5">
                                  <span>{comment.authorEmail}</span>
                                  <span>&bull;</span>
                           <span>{new Date(comment.createdAt).toLocaleDateString("pl-PL")}</span>
                               </div>
                               <div className={`rounded-2xl px-4 py-2.5 text-sm ${
                                  comment.isAuthor 
                                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/10 rounded-tr-sm" 
                                    : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 rounded-tl-sm"
                               }`}>
                                  {comment.content}
                               </div>
                            </div>
                          </div>
                       ))
                    )}
                  </div>
                  
                  <div className="p-4 border-t border-slate-100 bg-slate-50/50 mt-auto flex gap-2 items-end dark:border-slate-800 dark:bg-slate-900/50 relative">
                     <textarea
                       placeholder="Napisz komentarz..."
                       value={newComment}
                       onChange={(e) => setNewComment(e.target.value)}
                       onKeyDown={(e) => {
                         if (e.key === "Enter" && !e.shiftKey) {
                           e.preventDefault();
                           handlePostComment();
                         }
                       }}
                       rows={2}
                       className="flex-1 resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-600"
                     />
                     <button
                       onClick={handlePostComment}
                       disabled={isSubmittingComment || !newComment.trim()}
                       className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
                     >
                       {isSubmittingComment ? <Clock className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 ml-0.5" />}
                     </button>
                  </div>
                </div>
              )}
            </div>

              {/* Drawer Footer Details */}
            <div className="shrink-0 border-t border-slate-100 bg-white p-5 lg:p-6 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    <div className="h-8 w-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-xs font-bold text-blue-700 dark:border-slate-900 dark:bg-blue-900/40 dark:text-blue-300">SR</div>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-slate-900 dark:text-slate-100">Udostępnione dla:</p>
                    <p className="text-slate-500 max-w-xs truncate dark:text-slate-400" title={selectedNote.sharedWith}>{selectedNote.sharedWith}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setShareModalOpen(true)}
                    className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-slate-900/10 hover:bg-slate-800 transition dark:bg-blue-600 dark:shadow-blue-900/20 dark:hover:bg-blue-700"
                  >
                    <Users className="h-4 w-4" />
                    Zaproś email
                  </button>
                </div>
              </div>
              
              <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                {selectedNote.tags.map((tag) => (
                  <span key={tag} className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

          </div>

          {/* Modal do udostępniania plików (Krok w Drawerze otwiera go) */}
          {shareModalOpen && selectedNote && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 dark:bg-slate-900/60">
              <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl relative dark:bg-slate-900 dark:border dark:border-slate-800">
                <button
                  onClick={() => setShareModalOpen(false)}
                  className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition dark:hover:text-slate-300"
                >
                  <X className="h-5 w-5" />
                </button>
                <h3 className="text-2xl font-bold text-slate-900 mb-2 dark:text-slate-100">Zapisz uprawnienia</h3>
                <p className="text-sm text-slate-500 mb-6 dark:text-slate-400">Zaproś konkretną osobę z Twojego roku dodając jej email z domeny studenckiej.</p>
                
                <form onSubmit={handleSubmit(handleShare)}>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-300">
                    Adres email studenta:
                  </label>
                  <input
                    type="email"
                    {...register("email")}
                    placeholder="np. 123456@stud.prz.edu.pl"
                    className={`w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 transition-all mb-1 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-900 ${
                      errors.email
                        ? "border-red-300 focus:border-red-500 focus:ring-red-100 dark:border-red-500/50 dark:focus:border-red-500 dark:focus:ring-red-500/20"
                        : "border-slate-200 focus:border-blue-500 focus:ring-blue-100 dark:border-slate-700 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                    }`}
                  />
                  {errors.email && (
                    <p className="text-xs text-red-500 mb-6 dark:text-red-400">{errors.email.message}</p>
                  )}
                  {!errors.email && <div className="mb-6"></div>}
                  
                  <div className="flex gap-3 justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => setShareModalOpen(false)}
                      className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition dark:text-slate-300 dark:hover:bg-slate-800"
                      disabled={isPending}
                    >
                      Anuluj
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed dark:shadow-blue-900/20"
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