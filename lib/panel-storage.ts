export type RightPanelView = "problem" | "preview" | "chat" | "history";

const RIGHT_PANEL_KEY = "vimtex:rightPanel";

const VALID_VIEWS = new Set<RightPanelView>([
  "problem",
  "preview",
  "chat",
  "history",
]);

function isRightPanelView(value: string): value is RightPanelView {
  return VALID_VIEWS.has(value as RightPanelView);
}

export function loadRightPanelView(): RightPanelView | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(RIGHT_PANEL_KEY)?.trim();
    if (!raw || raw === "closed") return null;
    return isRightPanelView(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function saveRightPanelView(view: RightPanelView | null): void {
  if (typeof window === "undefined") return;
  try {
    if (view == null) {
      localStorage.removeItem(RIGHT_PANEL_KEY);
    } else {
      localStorage.setItem(RIGHT_PANEL_KEY, view);
    }
  } catch {
    // Quota or private browsing — ignore.
  }
}
