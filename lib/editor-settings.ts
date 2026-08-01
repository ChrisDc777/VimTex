const RELATIVE_LINE_NUMBERS_KEY = "vimtex:relativeLineNumbers";

export function loadRelativeLineNumbers(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const stored = localStorage.getItem(RELATIVE_LINE_NUMBERS_KEY);
    if (stored === null) return true;
    return stored === "1";
  } catch {
    return true;
  }
}

export function saveRelativeLineNumbers(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (enabled) {
      localStorage.setItem(RELATIVE_LINE_NUMBERS_KEY, "1");
    } else {
      localStorage.removeItem(RELATIVE_LINE_NUMBERS_KEY);
    }
  } catch {
    // Quota or private browsing — ignore.
  }
}
