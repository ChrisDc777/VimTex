const STORAGE_PREFIX = "vimtex:studio:";
const LEGACY_PREFIX = "vimtex:classic:";

export type StudioSplitLayout = {
  previewWidth: number;
  previewMobileHeight: number;
};

export const STUDIO_SPLIT_DEFAULTS: StudioSplitLayout = {
  previewWidth: 400,
  previewMobileHeight: 280,
};

export const STUDIO_SPLIT_LIMITS = {
  previewWidth: { min: 260, max: 640 },
  previewMobileHeight: { min: 160, max: 500 },
  editorMin: 280,
} as const;

const STORAGE_KEYS: Record<keyof StudioSplitLayout, string> = {
  previewWidth: `${STORAGE_PREFIX}previewWidth`,
  previewMobileHeight: `${STORAGE_PREFIX}previewMobileHeight`,
};

const LEGACY_KEYS: Record<keyof StudioSplitLayout, string> = {
  previewWidth: `${LEGACY_PREFIX}previewWidth`,
  previewMobileHeight: `${LEGACY_PREFIX}previewMobileHeight`,
};

function readStoredNumber(key: string, fallback: number): number {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const value = Number(raw);
    return Number.isFinite(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function loadStudioSplitLayout(): StudioSplitLayout {
  const hasStudioKeys =
    typeof window !== "undefined" &&
    (localStorage.getItem(STORAGE_KEYS.previewWidth) != null ||
      localStorage.getItem(STORAGE_KEYS.previewMobileHeight) != null);

  if (hasStudioKeys) {
    return {
      previewWidth: readStoredNumber(
        STORAGE_KEYS.previewWidth,
        STUDIO_SPLIT_DEFAULTS.previewWidth,
      ),
      previewMobileHeight: readStoredNumber(
        STORAGE_KEYS.previewMobileHeight,
        STUDIO_SPLIT_DEFAULTS.previewMobileHeight,
      ),
    };
  }

  return {
    previewWidth: readStoredNumber(
      LEGACY_KEYS.previewWidth,
      STUDIO_SPLIT_DEFAULTS.previewWidth,
    ),
    previewMobileHeight: readStoredNumber(
      LEGACY_KEYS.previewMobileHeight,
      STUDIO_SPLIT_DEFAULTS.previewMobileHeight,
    ),
  };
}

export function saveStudioSplitLayout(layout: StudioSplitLayout): void {
  if (typeof window === "undefined") return;
  try {
    for (const key of Object.keys(STORAGE_KEYS) as (keyof StudioSplitLayout)[]) {
      localStorage.setItem(STORAGE_KEYS[key], String(layout[key]));
    }
  } catch {
    // Quota or private browsing — ignore.
  }
}

export function clampStudioPreviewWidth(
  nextWidth: number,
  viewportWidth: number,
): number {
  const { min, max } = STUDIO_SPLIT_LIMITS.previewWidth;
  const budget = Math.max(
    min,
    viewportWidth - STUDIO_SPLIT_LIMITS.editorMin - 12,
  );
  return clamp(nextWidth, min, Math.min(max, budget));
}

export function clampStudioPreviewMobileHeight(
  nextHeight: number,
  viewportHeight: number,
): number {
  const { min, max } = STUDIO_SPLIT_LIMITS.previewMobileHeight;
  const cap = Math.max(min, viewportHeight - STUDIO_SPLIT_LIMITS.editorMin);
  return clamp(nextHeight, min, Math.min(max, cap));
}
