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

/** Matches `--rail-w` in globals.css */
export const RAIL_WIDTH = 40;

/** Matches `.vt-pane-resize-handle--vertical` width */
export const RESIZE_HANDLE_WIDTH = 12;

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

function clampPaneSide(pane: PaneId, width: number): number {
  const { min, max } = PANE_LIMITS[pane];
  return clamp(width, min, max);
}

export function availablePaneBudget(
  viewportWidth: number,
  open: PaneOpenState,
): number {
  const openPaneCount = (open.left ? 1 : 0) + (open.right ? 1 : 0);
  const chrome =
    2 * RAIL_WIDTH +
    openPaneCount * RESIZE_HANDLE_WIDTH +
    PANE_LIMITS.editorMin;
  return Math.max(0, viewportWidth - chrome);
}

function shrinkPanesToBudget(
  left: number,
  right: number,
  budget: number,
  open: PaneOpenState,
): { left: number; right: number } {
  let nextLeft = open.left ? left : 0;
  let nextRight = open.right ? right : 0;

  if (!open.left && !open.right) {
    return { left, right };
  }

  const shrink = (excess: number) => {
    while (excess > 0) {
      const leftMin = open.left ? PANE_LIMITS.left.min : 0;
      const rightMin = open.right ? PANE_LIMITS.right.min : 0;
      const leftSlack = open.left ? nextLeft - leftMin : 0;
      const rightSlack = open.right ? nextRight - rightMin : 0;
      const totalSlack = leftSlack + rightSlack;

      if (totalSlack <= 0) break;

      if (leftSlack >= rightSlack && leftSlack > 0) {
        const take = Math.min(excess, leftSlack);
        nextLeft -= take;
        excess -= take;
        continue;
      }

      if (rightSlack > 0) {
        const take = Math.min(excess, rightSlack);
        nextRight -= take;
        excess -= take;
        continue;
      }

      break;
    }
  };

  const total = nextLeft + nextRight;
  if (total > budget) {
    shrink(total - budget);
  }

  return {
    left: open.left ? nextLeft : left,
    right: open.right ? nextRight : right,
  };
}

export function fitPaneLayoutToViewport(
  layout: PaneLayout,
  viewportWidth: number,
  open: PaneOpenState,
): PaneLayout {
  if (!open.left && !open.right) {
    return layout;
  }

  const budget = availablePaneBudget(viewportWidth, open);
  const fitted = shrinkPanesToBudget(
    clampPaneSide("left", layout.left),
    clampPaneSide("right", layout.right),
    budget,
    open,
  );

  if (fitted.left === layout.left && fitted.right === layout.right) {
    return layout;
  }

  return { ...layout, ...fitted };
}

export function clampPaneWidth(
  pane: PaneId,
  nextWidth: number,
  current: PaneLayout,
  viewportWidth: number,
  open: PaneOpenState,
): number {
  const fitted = fitPaneLayoutToViewport(
    { ...current, [pane]: nextWidth },
    viewportWidth,
    open,
  );
  return fitted[pane];
}

export function clampMobileBottomHeight(
  nextHeight: number,
  viewportHeight: number,
): number {
  const { min, max } = PANE_LIMITS.mobileBottomHeight;
  const maxHeight = Math.max(min, viewportHeight - PANE_LIMITS.editorMin);
  return clamp(nextHeight, min, Math.min(max, maxHeight));
}
