/**
 * Studio AI chrome prefs — surface clutter, not capability gates.
 * Gates in ai-features.ts still apply; these only hide UI.
 */

export type AiChromePrefs = {
  /** `/` menu in chat composer. */
  slashMenu: boolean;
  /** Fix errors / Add abstract pills above composer. */
  docActionPills: boolean;
  /** Insert-mode ghost completions in the editor. */
  ghostText: boolean;
};

const SLASH_KEY = "vimtex:aiChromeSlash";
const PILLS_KEY = "vimtex:aiChromeDocPills";
const GHOST_KEY = "vimtex:aiChromeGhost";
export const AI_CHROME_PREFS_EVENT = "vimtex:ai-chrome-prefs";

export const DEFAULT_AI_CHROME_PREFS: AiChromePrefs = {
  slashMenu: true,
  docActionPills: false,
  ghostText: true,
};

function readFlag(key: string, defaultValue: boolean): boolean {
  try {
    if (typeof localStorage === "undefined") return defaultValue;
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    return raw === "1";
  } catch {
    return defaultValue;
  }
}

function writeFlag(key: string, enabled: boolean): void {
  try {
    if (typeof localStorage === "undefined") return;
    if (enabled) localStorage.setItem(key, "1");
    else localStorage.setItem(key, "0");
  } catch {
    // ignore
  }
}

export function loadAiChromePrefs(): AiChromePrefs {
  return {
    slashMenu: readFlag(SLASH_KEY, DEFAULT_AI_CHROME_PREFS.slashMenu),
    docActionPills: readFlag(PILLS_KEY, DEFAULT_AI_CHROME_PREFS.docActionPills),
    ghostText: readFlag(GHOST_KEY, DEFAULT_AI_CHROME_PREFS.ghostText),
  };
}

export function saveAiChromePrefs(prefs: AiChromePrefs): void {
  writeFlag(SLASH_KEY, prefs.slashMenu);
  writeFlag(PILLS_KEY, prefs.docActionPills);
  writeFlag(GHOST_KEY, prefs.ghostText);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AI_CHROME_PREFS_EVENT));
  }
}

export function saveAiChromePref<K extends keyof AiChromePrefs>(
  key: K,
  value: AiChromePrefs[K],
): void {
  const next = { ...loadAiChromePrefs(), [key]: value };
  saveAiChromePrefs(next);
}
