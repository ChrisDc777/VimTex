"use client";

import { useEffect } from "react";
import { openPreferences } from "@/lib/ui-events";

type UseShellShortcutsOptions = {
  onTogglePalette: () => void;
  onToggleCheatsheet: () => void;
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
 */
export function useShellShortcuts({
  onTogglePalette,
  onToggleCheatsheet,
}: UseShellShortcutsOptions): void {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) {
        if (event.key === ",") {
          event.preventDefault();
          openPreferences();
          return;
        }
        if (event.key.toLowerCase() === "k") {
          event.preventDefault();
          onTogglePalette();
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
  }, [onTogglePalette, onToggleCheatsheet]);
}
