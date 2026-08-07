/**
 * User prefs for AI review UX (taste), separate from shell capability gates.
 */

export type AiApplyMode = "confirm" | "auto";

export type AiReviewPrefs = {
  applyMode: AiApplyMode;
  /** When true and a preview pane is mounted, show rendered Before/After. */
  showInPreview: boolean;
};

const APPLY_MODE_KEY = "vimtex:aiApplyMode";
const SHOW_IN_PREVIEW_KEY = "vimtex:aiShowInPreview";

export const DEFAULT_AI_REVIEW_PREFS: AiReviewPrefs = {
  applyMode: "confirm",
  showInPreview: false,
};

export function loadAiReviewPrefs(): AiReviewPrefs {
  try {
    if (typeof localStorage === "undefined") {
      return { ...DEFAULT_AI_REVIEW_PREFS };
    }
    const mode = localStorage.getItem(APPLY_MODE_KEY);
    const applyMode: AiApplyMode =
      mode === "auto" || mode === "confirm" ? mode : "confirm";
    const show = localStorage.getItem(SHOW_IN_PREVIEW_KEY);
    return {
      applyMode,
      showInPreview: show === "1",
    };
  } catch {
    return { ...DEFAULT_AI_REVIEW_PREFS };
  }
}

export function saveAiApplyMode(mode: AiApplyMode): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(APPLY_MODE_KEY, mode);
  } catch {
    // ignore
  }
}

export function saveAiShowInPreview(enabled: boolean): void {
  try {
    if (typeof localStorage === "undefined") return;
    if (enabled) localStorage.setItem(SHOW_IN_PREVIEW_KEY, "1");
    else localStorage.removeItem(SHOW_IN_PREVIEW_KEY);
  } catch {
    // ignore
  }
}

export function saveAiReviewPrefs(prefs: AiReviewPrefs): void {
  saveAiApplyMode(prefs.applyMode);
  saveAiShowInPreview(prefs.showInPreview);
}
