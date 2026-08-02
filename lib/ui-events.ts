const OPEN_PREFERENCES_EVENT = "vimtex:open-preferences";

export function openPreferences(): void {
  window.dispatchEvent(new CustomEvent(OPEN_PREFERENCES_EVENT));
}

export function subscribeOpenPreferences(handler: () => void): () => void {
  const listener = () => handler();
  window.addEventListener(OPEN_PREFERENCES_EVENT, listener);
  return () => window.removeEventListener(OPEN_PREFERENCES_EVENT, listener);
}
