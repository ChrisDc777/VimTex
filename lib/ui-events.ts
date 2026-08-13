const OPEN_PREFERENCES_EVENT = "vimtex:open-preferences";
const OPEN_NOTE_IMPORT_EVENT = "vimtex:open-note-import";

export function openPreferences(): void {
  window.dispatchEvent(new CustomEvent(OPEN_PREFERENCES_EVENT));
}

export function subscribeOpenPreferences(handler: () => void): () => void {
  const listener = () => handler();
  window.addEventListener(OPEN_PREFERENCES_EVENT, listener);
  return () => window.removeEventListener(OPEN_PREFERENCES_EVENT, listener);
}

export function openNoteImport(): void {
  window.dispatchEvent(new CustomEvent(OPEN_NOTE_IMPORT_EVENT));
}

export function subscribeOpenNoteImport(handler: () => void): () => void {
  const listener = () => handler();
  window.addEventListener(OPEN_NOTE_IMPORT_EVENT, listener);
  return () => window.removeEventListener(OPEN_NOTE_IMPORT_EVENT, listener);
}
