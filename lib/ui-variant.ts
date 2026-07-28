export type UiVariant = "studio" | "forge";

/** @deprecated Legacy localStorage values — migrated on load */
const LEGACY_UI_VARIANTS = {
  classic: "studio",
  quietCraft: "forge",
} as const satisfies Record<string, UiVariant>;

export const UI_VARIANT_KEY = "vimtex:uiVariant";
export const DEFAULT_UI_VARIANT: UiVariant = "studio";

export function normalizeUiVariant(value: unknown): UiVariant | null {
  if (value === "studio" || value === "forge") return value;
  if (typeof value === "string" && value in LEGACY_UI_VARIANTS) {
    return LEGACY_UI_VARIANTS[value as keyof typeof LEGACY_UI_VARIANTS];
  }
  return null;
}

export function isUiVariant(value: unknown): value is UiVariant {
  return normalizeUiVariant(value) != null;
}

export function loadUiVariant(): UiVariant {
  if (typeof window === "undefined") return DEFAULT_UI_VARIANT;
  try {
    const raw = localStorage.getItem(UI_VARIANT_KEY);
    const normalized = normalizeUiVariant(raw);
    if (normalized) {
      if (raw !== normalized) saveUiVariant(normalized);
      return normalized;
    }
  } catch {
    // ignore
  }
  return DEFAULT_UI_VARIANT;
}

export function saveUiVariant(variant: UiVariant): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(UI_VARIANT_KEY, variant);
  } catch {
    // ignore
  }
}

export function uiVariantLabel(variant: UiVariant): string {
  return variant === "studio" ? "Studio" : "Forge";
}

export const UI_VARIANTS: readonly UiVariant[] = ["studio", "forge"];
