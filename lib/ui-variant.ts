export type UiVariant = "classic" | "quietCraft";

export const UI_VARIANT_KEY = "vimtex:uiVariant";
export const DEFAULT_UI_VARIANT: UiVariant = "classic";

export function isUiVariant(value: unknown): value is UiVariant {
  return value === "classic" || value === "quietCraft";
}

export function loadUiVariant(): UiVariant {
  if (typeof window === "undefined") return DEFAULT_UI_VARIANT;
  try {
    const raw = localStorage.getItem(UI_VARIANT_KEY);
    if (isUiVariant(raw)) return raw;
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
  return variant === "classic" ? "Classic" : "Quiet Craft";
}
