/**
 * Studio color themes — mesh-gradient palettes (light + dark).
 * Inspired by T3-style theme cards; “studio” keeps the shipped default.
 */

export type StudioAppearance = "light" | "dark";

export type StudioColorThemeId =
  | "studio"
  | "cobalt"
  | "rose"
  | "grove"
  | "ocean"
  | "ember"
  | "iris";

export const STUDIO_COLOR_THEME_KEY = "vimtex:studioColorTheme";
export const STUDIO_APPEARANCE_KEY = "vimtex:studioAppearance";
export const STUDIO_COLOR_THEME_EVENT = "vimtex:studio-color-theme";

export const DEFAULT_STUDIO_COLOR_THEME: StudioColorThemeId = "studio";
export const DEFAULT_STUDIO_APPEARANCE: StudioAppearance = "dark";

/** Legacy ids from the first theme picker (T3-inspired labels). */
const LEGACY_STUDIO_COLOR_THEMES: Record<string, StudioColorThemeId> = {
  "t3-code": "cobalt",
  "t3-chat": "rose",
};

export const STUDIO_COLOR_THEMES = [
  "studio",
  "cobalt",
  "rose",
  "grove",
  "ocean",
  "ember",
  "iris",
] as const satisfies readonly StudioColorThemeId[];

export type StudioColorThemeMeta = {
  id: StudioColorThemeId;
  label: string;
  /** Swatch bases / glows for the Preferences picker (not runtime tokens). */
  light: { base: string; glow: string; glow2: string };
  dark: { base: string; glow: string; glow2: string };
};

export const STUDIO_COLOR_THEME_META: readonly StudioColorThemeMeta[] = [
  {
    id: "studio",
    label: "Studio",
    light: { base: "#f4f5f7", glow: "#a0c3ec", glow2: "#ffc285" },
    dark: { base: "#0a0a0a", glow: "#4a6d8f", glow2: "#ff7a17" },
  },
  {
    id: "cobalt",
    label: "Cobalt",
    light: { base: "#f3f4fb", glow: "#9bb0ff", glow2: "#c9d2ff" },
    dark: { base: "#0b0c12", glow: "#3d4f8f", glow2: "#1a2240" },
  },
  {
    id: "rose",
    label: "Rose",
    light: { base: "#fdf5f8", glow: "#f472b6", glow2: "#fb7185" },
    dark: { base: "#160a10", glow: "#9d174d", glow2: "#be185d" },
  },
  {
    id: "grove",
    label: "Grove",
    light: { base: "#f3f7f2", glow: "#86b89a", glow2: "#a7c4b0" },
    dark: { base: "#0c120e", glow: "#3d5c45", glow2: "#2f4a36" },
  },
  {
    id: "ocean",
    label: "Ocean",
    light: { base: "#f0f6fa", glow: "#5ba3d9", glow2: "#93c5e8" },
    dark: { base: "#081018", glow: "#1e4d6b", glow2: "#0e7490" },
  },
  {
    id: "ember",
    label: "Ember",
    light: { base: "#faf5f0", glow: "#e8a06a", glow2: "#f0b890" },
    dark: { base: "#140e0a", glow: "#9a4f28", glow2: "#c2410c" },
  },
  {
    id: "iris",
    label: "Iris",
    light: { base: "#f6f2fa", glow: "#b794f4", glow2: "#c4b5fd" },
    dark: { base: "#100a18", glow: "#5b3d8a", glow2: "#6d28d9" },
  },
];

export function normalizeStudioColorTheme(
  value: unknown,
): StudioColorThemeId | null {
  if (typeof value !== "string") return null;
  if ((STUDIO_COLOR_THEMES as readonly string[]).includes(value)) {
    return value as StudioColorThemeId;
  }
  return LEGACY_STUDIO_COLOR_THEMES[value] ?? null;
}

export function normalizeStudioAppearance(
  value: unknown,
): StudioAppearance | null {
  return value === "light" || value === "dark" ? value : null;
}

export function loadStudioColorTheme(): StudioColorThemeId {
  if (typeof localStorage === "undefined") return DEFAULT_STUDIO_COLOR_THEME;
  try {
    const raw = localStorage.getItem(STUDIO_COLOR_THEME_KEY);
    const theme =
      normalizeStudioColorTheme(raw) ?? DEFAULT_STUDIO_COLOR_THEME;
    // Rewrite legacy ids so prefs stay stable across refreshes.
    if (raw && raw !== theme) {
      localStorage.setItem(STUDIO_COLOR_THEME_KEY, theme);
    }
    return theme;
  } catch {
    return DEFAULT_STUDIO_COLOR_THEME;
  }
}

export function loadStudioAppearance(): StudioAppearance {
  if (typeof localStorage === "undefined") return DEFAULT_STUDIO_APPEARANCE;
  try {
    return (
      normalizeStudioAppearance(localStorage.getItem(STUDIO_APPEARANCE_KEY)) ??
      DEFAULT_STUDIO_APPEARANCE
    );
  } catch {
    return DEFAULT_STUDIO_APPEARANCE;
  }
}

export function saveStudioColorTheme(theme: StudioColorThemeId): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STUDIO_COLOR_THEME_KEY, theme);
    window.dispatchEvent(
      new CustomEvent(STUDIO_COLOR_THEME_EVENT, {
        detail: { theme, appearance: loadStudioAppearance() },
      }),
    );
  } catch {
    // ignore
  }
}

export function saveStudioAppearance(appearance: StudioAppearance): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STUDIO_APPEARANCE_KEY, appearance);
    window.dispatchEvent(
      new CustomEvent(STUDIO_COLOR_THEME_EVENT, {
        detail: { theme: loadStudioColorTheme(), appearance },
      }),
    );
  } catch {
    // ignore
  }
}

export function studioColorThemeLabel(id: StudioColorThemeId): string {
  return STUDIO_COLOR_THEME_META.find((t) => t.id === id)?.label ?? id;
}
