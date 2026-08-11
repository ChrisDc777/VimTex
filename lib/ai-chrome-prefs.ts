/**
 * Studio AI chrome prefs — surface clutter, not capability gates.
 * Gates in ai-features.ts still apply; these only hide UI.
 */

import {
  defaultEnabledSlashIds,
  isKnownSlashCommandId,
  normalizeCustomSlashId,
  type BuiltinSlashCommandId,
  type CustomSlashCommand,
} from "./slash-commands.ts";

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
  /** Which built-in `/` commands appear in the menu. */
  enabledSlashCommands: BuiltinSlashCommandId[];
  /** User-defined `/` commands. */
  customSlashCommands: CustomSlashCommand[];
};

const SLASH_KEY = "vimtex:aiChromeSlash";
const PILLS_KEY = "vimtex:aiChromeDocPills";
const GHOST_KEY = "vimtex:aiChromeGhost";
const SLASH_STYLE_KEY = "vimtex:aiChromeSlashStyle";
const SLASH_ENABLED_KEY = "vimtex:aiChromeSlashEnabled";
const SLASH_CUSTOM_KEY = "vimtex:aiChromeSlashCustom";
export const AI_CHROME_PREFS_EVENT = "vimtex:ai-chrome-prefs";

export const DEFAULT_AI_CHROME_PREFS: AiChromePrefs = {
  slashMenu: true,
  docActionPills: false,
  ghostText: true,
  slashTokenStyle: "gradient",
  enabledSlashCommands: defaultEnabledSlashIds(),
  customSlashCommands: [],
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

function readEnabledSlashCommands(): BuiltinSlashCommandId[] {
  try {
    if (typeof localStorage === "undefined") {
      return defaultEnabledSlashIds();
    }
    const raw = localStorage.getItem(SLASH_ENABLED_KEY);
    if (raw === null) return defaultEnabledSlashIds();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return defaultEnabledSlashIds();
    const ids = parsed.filter(
      (id): id is BuiltinSlashCommandId =>
        typeof id === "string" && isKnownSlashCommandId(id),
    );
    return ids.length > 0 ? ids : defaultEnabledSlashIds();
  } catch {
    return defaultEnabledSlashIds();
  }
}

function writeEnabledSlashCommands(ids: BuiltinSlashCommandId[]): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(SLASH_ENABLED_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

function readCustomSlashCommands(): CustomSlashCommand[] {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(SLASH_CUSTOM_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: CustomSlashCommand[] = [];
    const seen = new Set<string>();
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const id =
        typeof row.id === "string" ? normalizeCustomSlashId(row.id) : null;
      const instruction =
        typeof row.instruction === "string" ? row.instruction.trim() : "";
      if (!id || !instruction || seen.has(id)) continue;
      seen.add(id);
      out.push({
        id,
        title:
          typeof row.title === "string" && row.title.trim()
            ? row.title.trim().slice(0, 40)
            : id,
        hint:
          typeof row.hint === "string" && row.hint.trim()
            ? row.hint.trim().slice(0, 80)
            : "Custom command",
        instruction: instruction.slice(0, 2000),
      });
    }
    return out;
  } catch {
    return [];
  }
}

function writeCustomSlashCommands(commands: CustomSlashCommand[]): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(SLASH_CUSTOM_KEY, JSON.stringify(commands));
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
    customSlashCommands: readCustomSlashCommands(),
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
  writeCustomSlashCommands(prefs.customSlashCommands);
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
  id: BuiltinSlashCommandId,
  enabled: boolean,
): void {
  const prefs = loadAiChromePrefs();
  const set = new Set(prefs.enabledSlashCommands);
  if (enabled) set.add(id);
  else set.delete(id);
  if (set.size === 0) set.add("explain");
  saveAiChromePref("enabledSlashCommands", [...set]);
}

export function saveCustomSlashCommand(command: CustomSlashCommand): boolean {
  const id = normalizeCustomSlashId(command.id);
  const instruction = command.instruction.trim();
  if (!id || !instruction) return false;
  const prefs = loadAiChromePrefs();
  const next = prefs.customSlashCommands.filter((c) => c.id !== id);
  next.push({
    id,
    title: command.title.trim() || id,
    hint: command.hint.trim() || "Custom command",
    instruction,
  });
  saveAiChromePref("customSlashCommands", next);
  return true;
}

export function removeCustomSlashCommand(id: string): void {
  const prefs = loadAiChromePrefs();
  saveAiChromePref(
    "customSlashCommands",
    prefs.customSlashCommands.filter((c) => c.id !== id),
  );
}
