export type EditorMode = "vim" | "standard";

const EDITOR_MODE_KEY = "vimtex:editorMode";
export const DEFAULT_EDITOR_MODE: EditorMode = "vim";

export function isEditorMode(value: unknown): value is EditorMode {
  return value === "vim" || value === "standard";
}

export function loadEditorMode(): EditorMode {
  if (typeof window === "undefined") return DEFAULT_EDITOR_MODE;
  try {
    const raw = localStorage.getItem(EDITOR_MODE_KEY);
    if (isEditorMode(raw)) return raw;
  } catch {
    // ignore
  }
  return DEFAULT_EDITOR_MODE;
}

export function saveEditorMode(mode: EditorMode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(EDITOR_MODE_KEY, mode);
  } catch {
    // ignore
  }
}
