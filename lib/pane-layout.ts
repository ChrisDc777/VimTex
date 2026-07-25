export type PaneId = "left" | "right";

export type PaneLayout = {
  left: number;
  right: number;
  mobileBottomHeight: number;
};

export type PaneOpenState = {
  left: boolean;
  right: boolean;
};

export const PANE_DEFAULTS: PaneLayout = {
  left: 384,
  right: 448,
  mobileBottomHeight: 400,
};

export const PANE_LIMITS = {
  left: { min: 200, max: 560 },
  right: { min: 240, max: 640 },
  mobileBottomHeight: { min: 200, max: 600 },
  editorMin: 280,
} as const;

const STORAGE_PREFIX = "vimtex:pane:";

const STORAGE_KEYS: Record<keyof PaneLayout, string> = {
  left: `${STORAGE_PREFIX}leftWidth`,
  right: `${STORAGE_PREFIX}rightWidth`,
  mobileBottomHeight: `${STORAGE_PREFIX}mobileBottomHeight`,
};

const LEGACY_KEYS = {
  reference: `${STORAGE_PREFIX}referenceWidth`,
  preview: `${STORAGE_PREFIX}previewWidth`,
  chat: `${STORAGE_PREFIX}chatWidth`,
  chatMobileHeight: `${STORAGE_PREFIX}chatMobileHeight`,
} as const;

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

export function loadPaneLayout(): PaneLayout {
  const hasNewKeys =
    typeof window !== "undefined" &&
    (localStorage.getItem(STORAGE_KEYS.left) != null ||
      localStorage.getItem(STORAGE_KEYS.right) != null);

  if (hasNewKeys) {
    return {
      left: readStoredNumber(STORAGE_KEYS.left, PANE_DEFAULTS.left),
      right: readStoredNumber(STORAGE_KEYS.right, PANE_DEFAULTS.right),
      mobileBottomHeight: readStoredNumber(
        STORAGE_KEYS.mobileBottomHeight,
        PANE_DEFAULTS.mobileBottomHeight,
      ),
    };
  }

  const reference = readStoredNumber(
    LEGACY_KEYS.reference,
    PANE_DEFAULTS.left,
  );
  const preview = readStoredNumber(LEGACY_KEYS.preview, PANE_DEFAULTS.right);
  const chat = readStoredNumber(LEGACY_KEYS.chat, PANE_DEFAULTS.right);

  return {
    left: reference,
    right: Math.max(preview, chat),
    mobileBottomHeight: readStoredNumber(
      LEGACY_KEYS.chatMobileHeight,
      PANE_DEFAULTS.mobileBottomHeight,
    ),
  };
}

export function savePaneLayout(layout: PaneLayout): void {
  if (typeof window === "undefined") return;
  try {
    for (const key of Object.keys(STORAGE_KEYS) as (keyof PaneLayout)[]) {
      localStorage.setItem(STORAGE_KEYS[key], String(layout[key]));
    }
  } catch {
    // Quota or private browsing — ignore.
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function clampPaneWidth(
  pane: PaneId,
  nextWidth: number,
  current: PaneLayout,
  viewportWidth: number,
  open: PaneOpenState,
): number {
  const { min, max } = PANE_LIMITS[pane];
  let width = clamp(nextWidth, min, max);

  const left = pane === "left" ? width : open.left ? current.left : 0;
  const right = pane === "right" ? width : open.right ? current.right : 0;

  const maxSide = Math.max(
    PANE_LIMITS[pane].min,
    viewportWidth - PANE_LIMITS.editorMin,
  );
  const total = left + right;
  if (total > maxSide) {
    width = Math.max(min, width - (total - maxSide));
  }

  return width;
}

export function clampMobileBottomHeight(
  nextHeight: number,
  viewportHeight: number,
): number {
  const { min, max } = PANE_LIMITS.mobileBottomHeight;
  const maxHeight = Math.max(min, viewportHeight - PANE_LIMITS.editorMin);
  return clamp(nextHeight, min, Math.min(max, maxHeight));
}
