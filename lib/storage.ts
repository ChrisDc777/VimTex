import type { ViewMode } from "./types";

const NOTE_PREFIX = "vimtex:note:";
const VIEW_MODE_KEY = "vimtex:viewMode";

function noteKey(roomId: string): string {
  return `${NOTE_PREFIX}${roomId}`;
}

/**
 * Room-scoped local autosave for solo scratch sheets.
 */
export function loadNote(roomId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(noteKey(roomId));
    return raw ?? null;
  } catch {
    return null;
  }
}

export function saveNote(roomId: string, note: string): void {
  if (typeof window === "undefined") return;
  try {
    if (note.length === 0) {
      localStorage.removeItem(noteKey(roomId));
    } else {
      localStorage.setItem(noteKey(roomId), note);
    }
  } catch {
    // Quota or private browsing — ignore.
  }
}

export function clearNote(roomId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(noteKey(roomId));
  } catch {
    // ignore
  }
}

export function loadViewMode(): ViewMode | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(VIEW_MODE_KEY);
    if (raw === "realtime" || raw === "split") return raw;
  } catch {
    // ignore
  }
  return null;
}

export function saveViewMode(mode: ViewMode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(VIEW_MODE_KEY, mode);
  } catch {
    // ignore
  }
}
