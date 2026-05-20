"use client";

import React, { useEffect, useRef, useState, useTransition } from "react";
import { Lock, Share2, Users, Globe } from "lucide-react";
import { createPortal } from "react-dom";
import { updateFileVisibility } from "@/app/actions/sharing";
import { toast } from "sonner";

type VisibilityType = "PRIVATE" | "DIRECT" | "GROUP" | "YEAR";

const visibilityConfig: Record<VisibilityType, { label: string; icon: React.ReactNode; color: string }> = {
  PRIVATE: { label: "Prywatny", icon: <Lock className="w-4 h-4" />, color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  DIRECT: { label: "Wybrani", icon: <Share2 className="w-4 h-4" />, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  GROUP: { label: "Grupa", icon: <Users className="w-4 h-4" />, color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  YEAR: { label: "Rok", icon: <Globe className="w-4 h-4" />, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
};

export default function VisibilitySelectorInline({ fileId, currentVisibility, compact = false, readOnly = false, menu = false, onVisibilityChange, }: { fileId: string; currentVisibility: VisibilityType; compact?: boolean; readOnly?: boolean; menu?: boolean; onVisibilityChange?: (value: VisibilityType) => void; }) {
  const [isPending, startTransition] = useTransition();
  const [displayVisibility, setDisplayVisibility] = useState<VisibilityType>(currentVisibility);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setDisplayVisibility(currentVisibility);
  }, [currentVisibility]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuOpen && rootRef.current && !rootRef.current.contains(event.target as Node) && (!menuRef.current || !menuRef.current.contains(event.target as Node))) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    if (menu && menuOpen && rootRef.current) {
      const rect = rootRef.current.getBoundingClientRect();
      const menuHeight = 110; // approximate height of the menu
      const spaceBelow = window.innerHeight - rect.bottom;
      
      // Position above or below based on available space
      const top = spaceBelow > menuHeight ? rect.bottom + 8 : rect.top - menuHeight - 8;
      
      setMenuPos({
        top: Math.max(8, top), // ensure minimum margin from top
        right: window.innerWidth - rect.right,
      });
    }
  }, [menuOpen, menu]);

  const handleChange = (e: React.MouseEvent, value: VisibilityType) => {
    e.stopPropagation();
    if (readOnly) return;
    if (isPending || value === displayVisibility) return;
    const previousVisibility = displayVisibility;
    setDisplayVisibility(value);
    setMenuOpen(false);
    startTransition(async () => {
      try {
        await updateFileVisibility(fileId, value);
        onVisibilityChange?.(value);
        toast.success("Zaktualizowano!");
      } catch (err: unknown) {
        setDisplayVisibility(previousVisibility);
        onVisibilityChange?.(previousVisibility);
        const errorMessage = err instanceof Error ? err.message : "Błąd podczas zmiany widoczności";
        toast.error(errorMessage);
      }
    });
  };

  if (readOnly) {
    const cfg = visibilityConfig[displayVisibility];

    return (
      <div className="inline-flex max-w-[220px] items-center gap-1 rounded-full border border-slate-200 bg-white/85 px-1.5 py-1 text-[10px] font-medium text-slate-600 shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-300">
        <span className={`${cfg.color} shrink-0 rounded-full p-1`}>{cfg.icon}</span>
        <span className="whitespace-nowrap leading-none">{cfg.label}</span>
      </div>
    );
  }

  if (menu) {
    const cfg = visibilityConfig[displayVisibility];

    return (
      <div ref={rootRef} className="relative inline-flex">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((value) => !value);
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-2 py-1 text-[11px] font-medium text-slate-700 shadow-sm backdrop-blur-sm transition hover:border-blue-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:border-blue-600"
        >
          <span className={`${cfg.color} shrink-0 rounded-full p-1`}>{cfg.icon}</span>
          <span className="whitespace-nowrap leading-none">{cfg.label}</span>
        </button>

      {menuOpen && mounted && createPortal(
        <div ref={menuRef} className="fixed z-[100] grid w-[230px] grid-cols-2 gap-1.5 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900" style={{ top: `${menuPos.top}px`, right: `${menuPos.right}px` }}>
            {(Object.entries(visibilityConfig) as Array<[VisibilityType, typeof visibilityConfig[VisibilityType]]>).map(([value, optionCfg]) => (
              <button
                key={value}
                type="button"
                onClick={(e) => handleChange(e, value)}
                disabled={isPending}
                className={`flex min-w-0 items-center gap-1 rounded-full px-2 py-1.5 text-[11px] font-medium border transition-all ${displayVisibility === value ? "ring-2 ring-blue-300 border-blue-200 bg-blue-50/70 text-blue-700 shadow-sm dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-200" : "border-slate-200 bg-white/80 text-slate-600 hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600"}`}
              >
                <span className={`${optionCfg.color} p-1 rounded-full`}>{optionCfg.icon}</span>
                <span className="truncate">{optionCfg.label}</span>
              </button>
            ))}
        </div>,
        document.body
      )}
      </div>
    );
  }

  return (
    <div className={`${compact ? "flex items-center gap-1" : "grid grid-cols-2 gap-1.5 w-full max-w-[192px]"}`}>
      {(Object.entries(visibilityConfig) as Array<[VisibilityType, typeof visibilityConfig[VisibilityType]]>).map(([value, cfg]) => (
        <button
          key={value}
          onClick={(e) => handleChange(e, value)}
          disabled={isPending}
          title={cfg.label}
          className={compact ? `flex items-center justify-center rounded-full p-1.5 text-xs transition-colors ${displayVisibility === value ? "ring-2 ring-blue-300" : "bg-white/0 hover:bg-white/5"}` : `flex min-w-0 items-center gap-1 rounded-full px-2 py-1.5 text-[11px] font-medium border transition-all ${displayVisibility === value ? "ring-2 ring-blue-300 border-blue-200 bg-blue-50/70 text-blue-700 shadow-sm dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-200" : "border-slate-200 bg-white/80 text-slate-600 hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600"}`}
        >
          <span className={`${cfg.color} p-1 rounded-full`}>{cfg.icon}</span>
          {!compact && <span className="truncate">{cfg.label}</span>}
        </button>
      ))}
    </div>
  );
}
