/**
 * Studio AI chrome prefs — surface clutter, not capability gates.
 * Gates in ai-features.ts still apply; these only hide UI.
 */

import {
  defaultEnabledSlashIds,
  isKnownSlashCommandId,
  type SlashCommandId,
} from "@/lib/slash-commands";

export type SlashTokenStyle = "gradient" | "simple";

export type AiChromePrefs = {
  /** `/` menu in chat composer. */
  slashMenu: boolean;
  /** Fix errors / Add abstract pills above composer. */
  docActionPills: boolean;
  /** Insert-mode ghost completions in the editor. */
  ghostText: boolean;
  /** Inline `/command` token coloring. */
  slashTokenStyle: SlashTokenStyle;
  /** Which `/` commands appear in the menu (typed known ids still parse). */
  enabledSlashCommands: SlashCommandId[];
};

const SLASH_KEY = "vimtex:aiChromeSlash";
const PILLS_KEY = "vimtex:aiChromeDocPills";
const GHOST_KEY = "vimtex:aiChromeGhost";
const SLASH_STYLE_KEY = "vimtex:aiChromeSlashStyle";
const SLASH_ENABLED_KEY = "vimtex:aiChromeSlashEnabled";
export const AI_CHROME_PREFS_EVENT = "vimtex:ai-chrome-prefs";

export const DEFAULT_AI_CHROME_PREFS: AiChromePrefs = {
  slashMenu: true,
  docActionPills: false,
  ghostText: true,
  slashTokenStyle: "gradient",
  enabledSlashCommands: defaultEnabledSlashIds(),
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

function readSlashTokenStyle(): SlashTokenStyle {
  try {
    if (typeof localStorage === "undefined") {
      return DEFAULT_AI_CHROME_PREFS.slashTokenStyle;
    }
    const raw = localStorage.getItem(SLASH_STYLE_KEY);
    if (raw === "simple" || raw === "gradient") return raw;
  } catch {
    // ignore
  }
  return DEFAULT_AI_CHROME_PREFS.slashTokenStyle;
}

function writeSlashTokenStyle(style: SlashTokenStyle): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(SLASH_STYLE_KEY, style);
  } catch {
    // ignore
  }
}

function readEnabledSlashCommands(): SlashCommandId[] {
  try {
    if (typeof localStorage === "undefined") {
      return defaultEnabledSlashIds();
    }
    const raw = localStorage.getItem(SLASH_ENABLED_KEY);
    if (raw === null) return defaultEnabledSlashIds();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return defaultEnabledSlashIds();
    const ids = parsed.filter(
      (id): id is SlashCommandId =>
        typeof id === "string" && isKnownSlashCommandId(id),
    );
    return ids.length > 0 ? ids : defaultEnabledSlashIds();
  } catch {
    return defaultEnabledSlashIds();
  }
}

function writeEnabledSlashCommands(ids: SlashCommandId[]): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(SLASH_ENABLED_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

/** Apply slash token style to the document for CSS selectors. */
export function applySlashTokenStyleToDocument(style: SlashTokenStyle): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.slashTokenStyle = style;
}

export function loadAiChromePrefs(): AiChromePrefs {
  const prefs: AiChromePrefs = {
    slashMenu: readFlag(SLASH_KEY, DEFAULT_AI_CHROME_PREFS.slashMenu),
    docActionPills: readFlag(PILLS_KEY, DEFAULT_AI_CHROME_PREFS.docActionPills),
    ghostText: readFlag(GHOST_KEY, DEFAULT_AI_CHROME_PREFS.ghostText),
    slashTokenStyle: readSlashTokenStyle(),
    enabledSlashCommands: readEnabledSlashCommands(),
  };
  applySlashTokenStyleToDocument(prefs.slashTokenStyle);
  return prefs;
}

export function saveAiChromePrefs(prefs: AiChromePrefs): void {
  writeFlag(SLASH_KEY, prefs.slashMenu);
  writeFlag(PILLS_KEY, prefs.docActionPills);
  writeFlag(GHOST_KEY, prefs.ghostText);
  writeSlashTokenStyle(prefs.slashTokenStyle);
  writeEnabledSlashCommands(prefs.enabledSlashCommands);
  applySlashTokenStyleToDocument(prefs.slashTokenStyle);
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

export function toggleEnabledSlashCommand(
  id: SlashCommandId,
  enabled: boolean,
): void {
  const prefs = loadAiChromePrefs();
  const set = new Set(prefs.enabledSlashCommands);
  if (enabled) set.add(id);
  else set.delete(id);
  // Keep at least one command so the menu never goes empty while slashMenu is on.
  if (set.size === 0) set.add("explain");
  saveAiChromePref("enabledSlashCommands", [...set]);
}
