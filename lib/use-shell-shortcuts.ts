"use client";

import { useEffect } from "react";
import { openPreferences } from "@/lib/ui-events";

type UseShellShortcutsOptions = {
  onTogglePalette: () => void;
  onToggleCheatsheet: () => void;
  /** Studio: toggle room chat panel. */
  onToggleChat?: () => void;
  /** Studio: cycle Live ↔ Split preview. */
  onToggleViewMode?: () => void;
  /** Studio: toggle light / dark appearance. */
  onToggleAppearance?: () => void;
};

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || el === document.body) return false;
  return (
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.isContentEditable
  );
}

/**
 * Shared Studio/Forge chrome shortcuts:
 * Ctrl/Cmd+K palette, Ctrl/Cmd+, preferences, ? cheatsheet.
 * Studio extras: Ctrl/Cmd+Shift+C chat, Ctrl/Cmd+Shift+V Live/Split,
 * Ctrl/Cmd+Shift+D light/dark.
 */
export function useShellShortcuts({
  onTogglePalette,
  onToggleCheatsheet,
  onToggleChat,
  onToggleViewMode,
  onToggleAppearance,
}: UseShellShortcutsOptions): void {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) {
        if (event.key === ",") {
          event.preventDefault();
          openPreferences();
          return;
        }
        if (event.key.toLowerCase() === "k" && !event.shiftKey) {
          event.preventDefault();
          onTogglePalette();
          return;
        }
        if (
          event.shiftKey &&
          event.key.toLowerCase() === "c" &&
          onToggleChat
        ) {
          event.preventDefault();
          onToggleChat();
          return;
        }
        if (
          event.shiftKey &&
          event.key.toLowerCase() === "v" &&
          onToggleViewMode
        ) {
          event.preventDefault();
          onToggleViewMode();
          return;
        }
        if (
          event.shiftKey &&
          event.key.toLowerCase() === "d" &&
          onToggleAppearance
        ) {
          event.preventDefault();
          onToggleAppearance();
          return;
        }
        return;
      }
      if (event.key === "?") {
        if (isEditableTarget(event.target)) return;
        event.preventDefault();
        onToggleCheatsheet();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [
    onTogglePalette,
    onToggleCheatsheet,
    onToggleChat,
    onToggleViewMode,
    onToggleAppearance,
  ]);
}
