const OPENROUTER_KEY = "vimtex:ai:openrouterKey";
const OPENCODE_KEY = "vimtex:ai:opencodeKey";

export type AiKeyBackend = "openrouter" | "opencode";

function storageKey(backend: AiKeyBackend): string {
  return backend === "opencode" ? OPENCODE_KEY : OPENROUTER_KEY;
}

export function loadUserAiKey(backend: AiKeyBackend = "openrouter"): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(storageKey(backend)) ?? "";
  } catch {
    return "";
  }
}

export function hasUserAiKey(backend: AiKeyBackend = "openrouter"): boolean {
  return loadUserAiKey(backend).trim().length > 0;
}

export function saveUserAiKey(
  key: string,
  backend: AiKeyBackend = "openrouter",
): void {
  try {
    const store = storageKey(backend);
    if (key.trim()) {
      localStorage.setItem(store, key.trim());
    } else {
      localStorage.removeItem(store);
    }
  } catch {
    // ignore
  }
}
