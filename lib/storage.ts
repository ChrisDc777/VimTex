import type { ViewMode } from "./types";

/**
 * Thin persistence seam for a later localStorage drop-in.
 * v1 is ephemeral — these no-ops keep call sites stable.
 */
const NOTE_KEY = "vimtex:note";
const VIEW_MODE_KEY = "vimtex:viewMode";

export function loadNote(): string | null {
  // Future: return localStorage.getItem(NOTE_KEY)
  void NOTE_KEY;
  return null;
}

export function saveNote(_note: string): void {
  // Future: localStorage.setItem(NOTE_KEY, _note)
  void _note;
}

export function loadViewMode(): ViewMode | null {
  // Future: parse localStorage.getItem(VIEW_MODE_KEY)
  void VIEW_MODE_KEY;
  return null;
}

export function saveViewMode(_mode: ViewMode): void {
  // Future: localStorage.setItem(VIEW_MODE_KEY, _mode)
  void _mode;
}
