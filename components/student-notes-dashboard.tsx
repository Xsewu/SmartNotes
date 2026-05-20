"use client";

import Link from "next/link";
import Image from "next/image";
import { logout } from "@/app/login/actions";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition, useOptimistic } from "react";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";
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
  Trash2,
  Layers,
  PenLine,
} from "lucide-react";
import { getSubjects } from "@/app/actions/subjects";
import { getDashboardFiles, handleShareUser, toggleFavorite, rateFile, getFileComments, addComment, getUserStats, deleteFile } from "@/app/actions/files";
import VisibilitySelectorInline from "@/components/visibility-selector-inline";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/theme-toggle";
import { FlashcardButton } from "../FlashcardButton";

type Category = "Kolokwium" | "Wykład" | "Projekt" | "Inne";
type ViewState = "dashboard" | "my-notes" | "upload" | "create-note" | "flashcards";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

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
  authorId: string;
  visibility: "PRIVATE" | "DIRECT" | "GROUP" | "YEAR";
  format: string;
}

interface NoteDraft {
  title: string;
  content: string;
  category: string;
  subjectId: string;
  savedAt: string;
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

const htmlToPlainText = (value: string) =>
  value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function NoteRow({
  note,
  onClick,
  onVisibilityChange,
  currentUserId,
}: {
  note: Note;
  onClick: () => void;
  onVisibilityChange: (visibility: Note["visibility"]) => void;
  currentUserId: string;
}) {
  const isAuthor = note.authorId === currentUserId;

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
        <VisibilitySelectorInline
          fileId={note.id}
          currentVisibility={note.visibility}
          menu={isAuthor}
          readOnly={!isAuthor}
          onVisibilityChange={isAuthor ? onVisibilityChange : undefined}
        />
      </div>
    </div>
  );
}

function NoteTile({
  note,
  onClick,
  onVisibilityChange,
  currentUserId,
}: {
  note: Note;
  onClick: () => void;
  onVisibilityChange: (visibility: Note["visibility"]) => void;
  currentUserId: string;
}) {
  const isAuthor = note.authorId === currentUserId;

  return (
    <div className="group relative flex h-full w-full flex-col overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white text-left shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/10 dark:border-slate-800/80 dark:bg-slate-900 dark:hover:border-blue-500/50 dark:hover:shadow-blue-900/20">
      <div className={`relative flex h-36 shrink-0 flex-col justify-between bg-gradient-to-br ${note.accent} p-5 text-white overflow-hidden`}>
        <div className="absolute inset-0 bg-black/10 mix-blend-overlay opacity-0 transition-opacity group-hover:opacity-100"></div>
        <div className="relative z-10 flex items-start justify-between">
          <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm backdrop-blur-md">
            {note.category}
          </span>
          <div className="flex gap-1.5">
            {note.isFavorite && (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 shadow-sm backdrop-blur-md">
                <Bookmark className="h-3.5 w-3.5 fill-yellow-300 text-yellow-300" />
              </span>
            )}
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 shadow-sm backdrop-blur-md">
              {note.format.toLowerCase() === "html" ? <FileText className="h-3.5 w-3.5 text-white/90" /> : <File className="h-3.5 w-3.5 text-white/90" />}
            </span>
          </div>
        </div>
        <div className="relative z-10 mt-auto">
          <h4 className="mb-1.5 line-clamp-2 text-lg font-bold leading-tight drop-shadow-sm">
            {note.title}
          </h4>
          <div className="flex items-center gap-3 text-xs font-medium text-white/90">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3 opacity-80" /> {note.updatedAt}</span>
            <span className="h-1 w-1 rounded-full bg-white/50" />
            <span>{note.pages} str.</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5 text-slate-700 dark:text-slate-300">
        <div className="mb-4 flex flex-wrap gap-1.5">
          {note.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mb-4 grid grid-cols-2 gap-x-2 gap-y-3 text-xs">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Przedmiot</span>
            <span className="truncate font-medium text-slate-700 dark:text-slate-200">{note.subject ? note.subject : "Brak"}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Udostępniono</span>
            <span className="truncate font-medium text-slate-700 dark:text-slate-200">{note.sharedWith}</span>
          </div>
        </div>

        <div className="mt-auto mb-4 flex items-center gap-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
            <MessageSquare className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            {note.commentsCount}
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            <Star className="h-4 w-4 fill-current" />
            {note.rating > 0 ? note.rating.toFixed(1) : "—"}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClick}
            className="group/btn flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-blue-600 hover:shadow-md hover:shadow-blue-500/20 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-blue-500 dark:hover:text-white"
          >
            <ExternalLink className="h-4 w-4 transition-transform group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5" />
            Otwórz
          </button>

          <div className="shrink-0 rounded-xl bg-slate-50 p-1 ring-1 ring-slate-200/60 dark:bg-slate-800 dark:ring-slate-700">
            <VisibilitySelectorInline
              fileId={note.id}
              currentVisibility={note.visibility}
              menu={isAuthor}
              readOnly={!isAuthor}
              onVisibilityChange={isAuthor ? onVisibilityChange : undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StudentNotesDashboard({ user, flashcardsList }: { user?: { id?: string; email?: string | null, image?: string | null }, flashcardsList?: React.ReactNode }) {
  const [currentView, setCurrentView] = useState<ViewState>("dashboard");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<"Wszystkie" | Category>("Wszystkie");
  
  const [subjects, setSubjects] = useState<{ id: number; name: string }[]>([]);
  const [activeSubject, setActiveSubject] = useState<number | "Wszystkie">("Wszystkie");

  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteCategory, setNoteCategory] = useState("Wykład");
  const [noteSubjectId, setNoteSubjectId] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  const [uploadFile, setUploadFile] = useState<globalThis.File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState("Kolokwium");
  const [uploadSubjectId, setUploadSubjectId] = useState("");
  const [uploadVisibility, setUploadVisibility] = useState<Note["visibility"]>("PRIVATE");
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
  const [htmlPreviewContent, setHtmlPreviewContent] = useState<string | null>(null);
  const [noteDraftSavedAt, setNoteDraftSavedAt] = useState<string | null>(null);
  const noteDraftStorageKey = useMemo(
    () => `smartnotes:note-draft:${user?.id ?? user?.email ?? "anonymous"}`,
    [user?.email, user?.id]
  );
  const noteDraftLoadedRef = useRef(false);

  // Zaawansowana konfiguracja paska narzędzi do edytora (uruchamiana tylko raz)
  const quillModules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['blockquote', 'code-block'],
      ['link', 'clean']
    ]
  }), []);

  // Funkcja ładująca komentarze gdy otwieramy plik
  useEffect(() => {
    if (selectedNote && drawerTab === "discussion") {
      setIsLoadingComments(true);
      getFileComments(selectedNote.id)
        .then((data) => setComments(data))
        .catch(() => toast.error("Nie udało się załadować komentarzy."))
        .finally(() => setIsLoadingComments(false));
    }

    if (selectedNote && drawerTab === "document") {
      const isHtml = selectedNote.format.toLowerCase() === 'html' || selectedNote.url.toLowerCase().endsWith('.html');
      if (isHtml) {
        fetch(selectedNote.url)
          .then(res => res.text())
          .then(text => setHtmlPreviewContent(text))
          .catch(() => setHtmlPreviewContent("<html><body><h3 style='color:red;'>Błąd pobierania notatki.</h3></body></html>"));
      } else {
        setHtmlPreviewContent(null);
      }
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

  const handleDeleteFile = async () => {
    if (!selectedNote) return;
    if (!confirm("Czy na pewno chcesz trwale usunąć ten plik? Tej operacji nie można cofnąć.")) return;

    try {
      await deleteFile(selectedNote.id);
      toast.success("Plik został pomyślnie usunięty.");
      setSelectedNote(null);
      fetchNotes(); // Odśwież widok notatek
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Błąd podczas usuwania.");
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
  const notePlainText = useMemo(() => htmlToPlainText(noteContent), [noteContent]);
  const noteWordCount = useMemo(() => (notePlainText ? notePlainText.split(" ").length : 0), [notePlainText]);
  const noteCharCount = notePlainText.length;
  const canSaveNote = noteTitle.trim().length > 0 && notePlainText.length > 0 && !isSavingNote;
  const hasNoteDraft = noteTitle.trim().length > 0 || noteContent.trim().length > 0 || noteCategory !== "Wykład" || noteSubjectId.trim().length > 0;

  const clearNoteDraft = useCallback(() => {
    localStorage.removeItem(noteDraftStorageKey);
    setNoteTitle("");
    setNoteContent("");
    setNoteCategory("Wykład");
    setNoteSubjectId("");
    setNoteDraftSavedAt(null);
  }, [noteDraftStorageKey]);

  useEffect(() => {
    noteDraftLoadedRef.current = false;

    try {
      const savedDraft = localStorage.getItem(noteDraftStorageKey);
      if (!savedDraft) {
        noteDraftLoadedRef.current = true;
        return;
      }

      const parsedDraft = JSON.parse(savedDraft) as Partial<NoteDraft>;
      setNoteTitle(parsedDraft.title ?? "");
      setNoteContent(parsedDraft.content ?? "");
      if (parsedDraft.category) setNoteCategory(parsedDraft.category);
      if (parsedDraft.subjectId !== undefined) setNoteSubjectId(parsedDraft.subjectId);
      if (parsedDraft.savedAt) setNoteDraftSavedAt(parsedDraft.savedAt);
    } catch {
      localStorage.removeItem(noteDraftStorageKey);
    } finally {
      noteDraftLoadedRef.current = true;
    }
  }, [noteDraftStorageKey]);

  useEffect(() => {
    if (!noteDraftLoadedRef.current) return;

    const draft: NoteDraft = {
      title: noteTitle,
      content: noteContent,
      category: noteCategory,
      subjectId: noteSubjectId,
      savedAt: new Date().toISOString(),
    };

    const hasDraftContent = [draft.title, draft.content, draft.category, draft.subjectId].some(
      (value) => value.trim().length > 0
    );

    const timeoutId = window.setTimeout(() => {
      try {
        if (!hasDraftContent) {
          localStorage.removeItem(noteDraftStorageKey);
          setNoteDraftSavedAt(null);
          return;
        }

        localStorage.setItem(noteDraftStorageKey, JSON.stringify(draft));
        setNoteDraftSavedAt(draft.savedAt);
      } catch {
        // Ignore storage failures so the editor keeps working.
      }
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [noteCategory, noteContent, noteDraftStorageKey, noteSubjectId, noteTitle]);

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

  const handleVisibilityChange = (note: Note, visibility: Note["visibility"]) => {
    const updatedNote = { ...note, visibility };

    startTransition(() => {
      setNotes((currentNotes) =>
        currentNotes.map((currentNote) => (currentNote.id === note.id ? updatedNote : currentNote))
      );
    });

    if (selectedNote?.id === note.id) {
      setSelectedNote(updatedNote);
    }

    if (visibility === "DIRECT") {
      setSelectedNote(updatedNote);
      setShareModalOpen(true);
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

  const handleSaveNote = async () => {
    if (!noteTitle || !noteContent) {
      toast.error("Wypełnij tytuł i treść notatki przed zapisaniem.");
      return;
    }
    setIsSavingNote(true);

    try {
      // Zapisujemy notatkę ze wsparciem dla Dark Mode (kolory dostosują się same)
      const htmlContent = `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${noteTitle}</title>
<style>
  :root { color-scheme: light dark; }
  body { 
    font-family: system-ui, -apple-system, sans-serif; 
    line-height: 1.6; 
    max-width: 800px; 
    margin: 0 auto; 
    padding: 2rem; 
    background-color: #ffffff;
    color: #0f172a;
  }
  @media (prefers-color-scheme: dark) {
    body { background-color: #0f172a; color: #f8fafc; }
  }
  h1 { border-bottom: 1px solid #cbd5e1; padding-bottom: 0.5rem; margin-bottom: 1.5rem; }
  @media (prefers-color-scheme: dark) { h1 { border-bottom-color: #334155; } }
  blockquote { border-left: 4px solid #3b82f6; margin: 1.5em 0; padding-left: 1rem; color: #475569; font-style: italic; }
  @media (prefers-color-scheme: dark) { blockquote { color: #94a3b8; border-left-color: #3b82f6; } }
  pre.ql-syntax { background: #f1f5f9; padding: 1rem; overflow-x: auto; border-radius: 8px; font-family: ui-monospace, monospace; font-size: 0.9em; border: 1px solid #e2e8f0; }
  @media (prefers-color-scheme: dark) { pre.ql-syntax { background: #1e293b; border-color: #334155; } }
  img { max-width: 100%; height: auto; border-radius: 8px; margin: 1rem 0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
</style>
</head>
<body>
  <h1>${noteTitle}</h1>
  ${noteContent}
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: "text/html" });
      const file = new globalThis.File([blob], `${noteTitle}.html`, { type: "text/html" });

      // Pakujemy go do paczki i wysyłamy do istniejącego API tak jak zwykły upload!
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", noteTitle);
      formData.append("category", noteCategory);
      formData.append("visibility", "PRIVATE"); // Domyślnie notatka jest prywatna
      if (noteSubjectId) formData.append("subjectId", noteSubjectId);

      const res = await fetch("/api/files", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Błąd podczas zapisywania notatki.");
      
      clearNoteDraft();
      toast.success("Notatka została pomyślnie zapisana!");
      setNoteTitle("");
      setNoteContent("");
      setNoteSubjectId("");
      fetchNotes(); // Odśwież listę w tle
      setCurrentView("my-notes"); // Przenieś do widoku notatek
    } catch (error) {
      toast.error("Wystąpił problem z zapisem notatki.");
      console.error(error);
    } finally {
      setIsSavingNote(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

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
    { id: "create-note", label: "Utwórz notatkę", icon: PenLine },
    { id: "flashcards", label: "Moje fiszki", icon: Layers },
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
              <Image src={user.image} alt="Avatar" width={40} height={40} className="h-10 w-10 rounded-full object-cover shadow-sm border border-slate-200 dark:border-slate-700" />
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
                onClick={() => logout()}
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
                  <Image src={user.image} alt="Avatar" width={40} height={40} className="h-full w-full object-cover" />
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
                    onClick={() => logout()}
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
                    <NoteTile
                      key={note.id}
                      note={note}
                      onClick={() => setSelectedNote(note)}
                      onVisibilityChange={(visibility) => handleVisibilityChange(note, visibility)}
                      currentUserId={user?.id || ""}
                    />
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
                        <div className="h-44 rounded-t-2xl bg-slate-100 dark:bg-slate-800"></div>
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
                            // @ts-expect-error framer-motion variants typing is narrower here
                            variants={itemVariants}
                            className="w-full"
                          >
                            {viewMode === 'grid' ? (
                              <NoteTile
                                note={note}
                                onClick={() => setSelectedNote(note)}
                                onVisibilityChange={(visibility) => handleVisibilityChange(note, visibility)}
                                currentUserId={user?.id || ""}
                              />
                            ) : (
                              <NoteRow 
                                note={note}
                                onClick={() => setSelectedNote(note)}
                                onVisibilityChange={(visibility) => handleVisibilityChange(note, visibility)}
                                currentUserId={user?.id || ""}
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
                             onChange={(e) => setUploadVisibility(e.target.value as Note["visibility"])}
                             className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-400"
                           >
                             <option value="PRIVATE">Prywatny</option>
                             <option value="DIRECT">Wybrani użytkownicy</option>
                             <option value="GROUP">Moja Grupa</option>
                             <option value="YEAR">Cały Rocznik</option>
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

          {/* VIEW: CREATE NOTE */}
          {currentView === "create-note" && (
            <div className="mx-auto max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500 h-full pb-10 flex flex-col">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-10 dark:border-slate-800 dark:bg-slate-900 flex-1 flex flex-col min-h-[700px]">
                <div className="mb-6 flex flex-col gap-4 border-b border-slate-100 pb-6 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Nowa notatka</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Napisz tytuł, dobierz kontekst i formatuj treść bez wychodzenia z jednego ekranu.</p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 sm:max-w-full">
                      <span className={`h-2.5 w-2.5 rounded-full ${hasNoteDraft ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />
                      <span className="truncate">{hasNoteDraft ? `Szkic zapisany${noteDraftSavedAt ? ` · ${new Date(noteDraftSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}` : "Brak szkicu"}</span>
                    </div>
                    <button
                      type="button"
                      onClick={clearNoteDraft}
                      disabled={!hasNoteDraft}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 sm:self-end"
                    >
                      Usuń szkic
                    </button>
                    <button 
                      onClick={() => {
                        clearNoteDraft();
                        setCurrentView("my-notes");
                      }}
                      className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 sm:self-end"
                    >
                      Anuluj
                    </button>
                    <button 
                      onClick={handleSaveNote}
                      disabled={!canSaveNote}
                      className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed dark:shadow-blue-900/20 sm:self-end"
                    >
                      {isSavingNote ? <Clock className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
                      {isSavingNote ? "Zapisywanie..." : "Zapisz do bazy"}
                    </button>
                  </div>
                </div>

                <div className="flex-1 space-y-5 flex flex-col">
                  <div className="space-y-2">
                    <label className="sr-only" htmlFor="note-title">Tytuł notatki</label>
                    <input 
                      id="note-title"
                      type="text" 
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                      placeholder="Nadaj notatce konkretny tytuł..."
                      className="w-full bg-transparent px-2 text-3xl font-bold text-slate-900 placeholder-slate-300 outline-none transition-all dark:text-slate-100 dark:placeholder-slate-700" 
                    />
                    <p className="px-2 text-sm text-slate-500 dark:text-slate-400">Dobry tytuł pozwala szybciej wrócić do notatki po czasie.</p>
                  </div>

                  <div className="grid gap-4 px-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                    <label className="space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Kategoria</span>
                      <select value={noteCategory} onChange={(e) => setNoteCategory(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        <option value="Kolokwium">Kolokwium</option><option value="Wykład">Wykład</option><option value="Projekt">Projekt</option><option value="Inne">Inne</option>
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Przedmiot</span>
                      <select value={noteSubjectId} onChange={(e) => setNoteSubjectId(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        <option value="">Brak przedmiotu</option>
                        {subjects.map((subj) => (<option key={subj.id} value={subj.id}>{subj.name}</option>))}
                      </select>
                    </label>
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-400">
                      <div className="font-medium text-slate-700 dark:text-slate-200">{noteWordCount} słów</div>
                      <div>{noteCharCount} znaków bez znaczników</div>
                    </div>
                  </div>

                  <div className="flex-1 mt-2 rounded-2xl border border-slate-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-slate-900/50 flex flex-col [&_.ql-toolbar]:border-none [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-slate-200 dark:[&_.ql-toolbar]:border-slate-800 [&_.ql-toolbar]:bg-slate-50/50 dark:[&_.ql-toolbar]:bg-slate-900/80 [&_.ql-container]:border-none [&_.ql-editor]:min-h-[400px] [&_.ql-editor]:text-base [&_.ql-editor]:text-slate-800 dark:[&_.ql-editor]:text-slate-200 [&_.ql-stroke]:dark:stroke-slate-400 [&_.ql-fill]:dark:fill-slate-400 [&_.ql-picker]:dark:text-slate-400">
                    <ReactQuill 
                      theme="snow"
                      value={noteContent}
                      onChange={setNoteContent}
                      modules={quillModules}
                      placeholder="Zacznij pisać swoją notatkę tutaj... Możesz wklejać obrazki, linki i zaznaczać kod."
                      className="flex-1 flex flex-col"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 px-2 pb-1 text-sm text-slate-500 dark:text-slate-400">
                    <p>{notePlainText ? "Treść jest gotowa do zapisania." : "Dodaj treść notatki, aby odblokować zapis."}</p>
                    <button
                      type="button"
                      onClick={() => setNoteContent("")}
                      className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Wyczyść treść
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: FLASHCARDS */}
          {currentView === "flashcards" && (
             <div className="mx-auto max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="mb-6">
                 <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Moje talie fiszek</h2>
                 <p className="mt-2 text-slate-500 dark:text-slate-400">Przeglądaj i ucz się ze swoich materiałów wygenerowanych przez AI.</p>
               </div>
               {flashcardsList}
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
          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-3xl transform flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out sm:w-[500px] md:w-[700px] dark:border-slate-800 dark:bg-slate-900">
            
            {/* Drawer Header */}
            <div className="flex shrink-0 flex-col gap-3 border-b border-slate-100 px-6 py-4 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-semibold text-slate-900 dark:text-slate-100">{selectedNote.title}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>Dodano: {selectedNote.updatedAt}</span>
                  <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">{selectedNote.category}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 self-start sm:ml-4">
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
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-100/50 p-0 sm:p-4 dark:bg-slate-900/50">
              {drawerTab === "document" ? (
                <div className="h-full min-h-0 w-full overflow-hidden border-0 bg-white shadow-sm sm:rounded-xl sm:border sm:border-slate-200 dark:border-slate-700 dark:bg-slate-900">
                  {selectedNote.format.toLowerCase() === 'html' || selectedNote.url.toLowerCase().endsWith('.html') ? (
                    <iframe 
                      srcDoc={htmlPreviewContent || "<html><body style='font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; color: #64748b;'>Ładowanie notatki...</body></html>"} 
                      className="h-full w-full border-none bg-white dark:bg-slate-900"
                      title={selectedNote.title}
                    />
                  ) : (
                    <iframe 
                      src={`${selectedNote.url}#toolbar=0`} 
                      className="h-full w-full border-none bg-white dark:bg-slate-900"
                      title={selectedNote.title}
                    />
                  )}
                </div>
              ) : (
                <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white shadow-sm sm:rounded-xl sm:border sm:border-slate-200 dark:border-slate-700 dark:bg-slate-900">
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
                  
                  <div className="flex-1 min-h-0 overflow-y-auto p-5 pb-20 scroll-smooth space-y-5">
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
                               <Image src={comment.authorImage} alt="" width={32} height={32} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full object-cover border border-slate-200 shadow-sm dark:border-slate-800" />
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
                  
                  <div className="relative mt-auto flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50 sm:flex-row sm:items-end">
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
                       className="min-h-[92px] flex-1 resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-600 sm:min-h-0"
                     />
                     <button
                       onClick={handlePostComment}
                       disabled={isSubmittingComment || !newComment.trim()}
                       className="flex h-12 w-full shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-blue-700 sm:w-12 sm:px-0"
                     >
                       {isSubmittingComment ? <Clock className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 ml-0.5" />}
                     </button>
                  </div>
                </div>
              )}
            </div>

              {/* Drawer Footer Details */}
            <div className="shrink-0 border-t border-slate-100 bg-white p-5 lg:p-6 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="grid w-full gap-2 sm:w-auto sm:flex sm:flex-wrap sm:items-center">
                  <FlashcardButton fileId={selectedNote.id} format={selectedNote.format} />
                  {selectedNote.authorId === user?.id && (
                    <button
                      onClick={() => setShareModalOpen(true)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 sm:w-auto sm:py-1.5"
                    >
                      <Share2 className="w-4 h-4" /> Udostępnij
                    </button>
                  )}
                  {selectedNote.authorId === user?.id && (
                    <button
                      onClick={handleDeleteFile}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-transparent bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:cursor-not-allowed dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 sm:w-auto sm:py-1.5"
                    >
                      <Trash2 className="w-4 h-4" /> Usuń
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
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