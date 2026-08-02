const STORAGE_KEY = "vimtex:ai:openrouterKey";

export function loadUserAiKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function hasUserAiKey(): boolean {
  return loadUserAiKey().trim().length > 0;
}

export function saveUserAiKey(key: string): void {
  try {
    if (key.trim()) {
      localStorage.setItem(STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}
