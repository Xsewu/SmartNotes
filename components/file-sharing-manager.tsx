"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { Share2, X, Plus, Lock, Users, Globe, ChevronDown } from "lucide-react";
import { addFileShare, removeFileShare, updateFileVisibility, getFileShareRecipients, ShareRecipient } from "@/app/actions/sharing";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type VisibilityType = "PRIVATE" | "DIRECT" | "GROUP" | "YEAR";

interface FileSharingManagerProps {
  fileId: string;
  currentVisibility: VisibilityType;
  isAuthor: boolean;
}

const visibilityConfig: Record<VisibilityType, { label: string; description: string; icon: React.ReactNode; color: string }> = {
  PRIVATE: {
    label: "Prywatny",
    description: "Tylko Ty",
    icon: <Lock className="w-3.5 h-3.5" />,
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  DIRECT: {
    label: "Wybrani",
    description: "Konkretni ludzie",
    icon: <Share2 className="w-3.5 h-3.5" />,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  GROUP: {
    label: "Grupa",
    description: "Twoja grupa",
    icon: <Users className="w-3.5 h-3.5" />,
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  },
  YEAR: {
    label: "Rok",
    description: "Cały Twój rok",
    icon: <Globe className="w-3.5 h-3.5" />,
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  },
};

export function FileSharingManager({ fileId, currentVisibility, isAuthor }: FileSharingManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [recipients, setRecipients] = useState<Array<ShareRecipient & { permissionId: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [activeVisibility, setActiveVisibility] = useState<VisibilityType>(currentVisibility);

  useEffect(() => {
    setActiveVisibility(currentVisibility);
  }, [currentVisibility]);

  const handleOpenModal = async () => {
    if (!isAuthor) return;
    setIsOpen(true);
    setIsLoading(true);

    try {
      const recipientsData = await getFileShareRecipients(fileId);
      setRecipients(recipientsData);
    } catch {
      toast.error("Nie udało się wczytać danych");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareEmail.trim()) {
      toast.error("Podaj adres email");
      return;
    }

    startTransition(async () => {
      try {
        await addFileShare(fileId, shareEmail);
        toast.success(`Udostępniono dla ${shareEmail}`);
        setShareEmail("");
        const updated = await getFileShareRecipients(fileId);
        setRecipients(updated);
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : "Nie udało się udostępnić pliku");
      }
    });
  };

  const handleRemoveShare = async (recipientId: string) => {
    startTransition(async () => {
      try {
        await removeFileShare(fileId, recipientId);
        setRecipients((currentRecipients) => currentRecipients.filter((recipient) => recipient.permissionId !== recipientId));
        toast.success("Dostęp usunięty");
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : "Nie udało się usunąć dostępu");
      }
    });
  };

  const handleVisibilityChange = async (newVisibility: VisibilityType) => {
    startTransition(async () => {
      try {
        await updateFileVisibility(fileId, newVisibility);
        setActiveVisibility(newVisibility);
        toast.success("Zaktualizowano!");
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : "Błąd przy zmianie widoczności");
      }
    });
  };

  if (!isAuthor) {
    const config = visibilityConfig[activeVisibility];
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${config.color}`}>
        {config.icon}
        {config.label}
      </span>
    );
  }

  const config = visibilityConfig[activeVisibility];

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleOpenModal();
        }}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${config.color} border-current border-opacity-20 hover:shadow-sm`}
      >
        {config.icon}
        <span>{config.label}</span>
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: -10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -10 }}
              onClick={(e) => e.stopPropagation()}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="font-semibold text-slate-900 dark:text-white">Udostępnianie</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Zarządzaj dostępem do tego pliku</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 max-h-[70vh] overflow-y-auto">
                {isLoading ? (
                  <div className="text-center py-8 text-slate-500">Wczytywanie...</div>
                ) : (
                  <>
                    {/* Visibility Grid */}
                    <div className="mb-6">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-3 uppercase tracking-wide opacity-75">
                        Kto ma dostęp?
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {(Object.entries(visibilityConfig) as Array<[VisibilityType, typeof visibilityConfig[VisibilityType]]>).map(
                          ([value, config]) => (
                            <button
                              key={value}
                              onClick={() => handleVisibilityChange(value)}
                              disabled={isPending}
                              className={`p-3 rounded-xl border-2 transition-all text-left ${
                                activeVisibility === value
                                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/50"
                                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50 dark:bg-slate-800/50"
                              } ${isPending ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                            >
                              <div className="flex items-center gap-2 mb-1.5">
                                {config.icon}
                                <span className="font-medium text-sm text-slate-900 dark:text-white">{config.label}</span>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-400">{config.description}</p>
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {/* Direct Sharing */}
                    {(activeVisibility === "DIRECT" || activeVisibility === "PRIVATE") && (
                      <div className="pt-5 border-t border-slate-100 dark:border-slate-800">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-3 uppercase tracking-wide opacity-75">
                          Udostępnij konkretnym osobom
                        </label>

                        {/* Quick Add */}
                        <form onSubmit={handleAddShare} className="flex gap-2 mb-4">
                          <input
                            type="email"
                            placeholder="email@stud.prz.edu.pl"
                            value={shareEmail}
                            onChange={(e) => setShareEmail(e.target.value)}
                            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                          />
                          <button
                            type="submit"
                            disabled={isPending || !shareEmail.trim()}
                            className="px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </form>

                        {/* Recipients */}
                        {recipients.length > 0 ? (
                          <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 mb-3">
                            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Udostępniono dla:</p>
                            {recipients.map((recipient) => (
                              <div
                                key={recipient.permissionId}
                                className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {recipient.image ? (
                                    <Image
                                      src={recipient.image}
                                      alt=""
                                      width={24}
                                      height={24}
                                      className="h-6 w-6 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-blue-200 dark:bg-blue-900 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-300">
                                      {recipient.email.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                                    {recipient.email}
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleRemoveShare(recipient.permissionId)}
                                  disabled={isPending}
                                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors disabled:opacity-50"
                                >
                                  <X className="w-3.5 h-3.5 text-red-500" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg mb-3">
                            Brak udostępnień
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
