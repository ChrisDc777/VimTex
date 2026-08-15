/**
 * Version history prefs — checkpoint mode + idle/interval autosnap.
 * Browser-local; not a capability gate.
 *
 * Automatic | Manual is checkpoint policy only: live Yjs sync always continues.
 * Manual stops idle/interval creates; named versions are still saved explicitly.
 */

export const HISTORY_INTERVAL_MINUTES = [5, 10, 15] as const;
export type HistoryIntervalMinutes = (typeof HISTORY_INTERVAL_MINUTES)[number];

export type CheckpointMode = "automatic" | "manual";

export type HistoryPrefs = {
  /**
   * automatic — idle (+ optional interval) checkpoints
   * manual — only explicit “Name this version” / Save
   */
  checkpointMode: CheckpointMode;
  /** Snapshot after the note has been idle (no local edits). Ignored in manual. */
  idleAutosnap: boolean;
  /** Snapshot on a wall-clock interval while the room is open. Ignored in manual. */
  intervalAutosnap: boolean;
  intervalMinutes: HistoryIntervalMinutes;
};

const MODE_KEY = "vimtex:historyCheckpointMode";
const IDLE_KEY = "vimtex:historyIdleAutosnap";
const INTERVAL_ON_KEY = "vimtex:historyIntervalAutosnap";
const INTERVAL_MIN_KEY = "vimtex:historyIntervalMinutes";

export const HISTORY_PREFS_EVENT = "vimtex:history-prefs";

export const DEFAULT_HISTORY_PREFS: HistoryPrefs = {
  checkpointMode: "automatic",
  idleAutosnap: true,
  intervalAutosnap: false,
  intervalMinutes: 10,
};

/** Debounce after the last local edit before an idle autosnap. */
export const IDLE_AUTOSNAP_MS = 45_000;

export function isHistoryIntervalMinutes(
  value: unknown,
): value is HistoryIntervalMinutes {
  return (
    typeof value === "number" &&
    (HISTORY_INTERVAL_MINUTES as readonly number[]).includes(value)
  );
}

export function isCheckpointMode(value: unknown): value is CheckpointMode {
  return value === "automatic" || value === "manual";
}

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
    localStorage.setItem(key, enabled ? "1" : "0");
  } catch {
    // ignore
  }
}

function readMode(): CheckpointMode {
  try {
    if (typeof localStorage === "undefined") {
      return DEFAULT_HISTORY_PREFS.checkpointMode;
    }
    const raw = localStorage.getItem(MODE_KEY);
    if (isCheckpointMode(raw)) return raw;
  } catch {
    // ignore
  }
  // Migrate: both autosnap flags off ⇒ treat as manual.
  if (
    !readFlag(IDLE_KEY, DEFAULT_HISTORY_PREFS.idleAutosnap) &&
    !readFlag(INTERVAL_ON_KEY, DEFAULT_HISTORY_PREFS.intervalAutosnap)
  ) {
    return "manual";
  }
  return DEFAULT_HISTORY_PREFS.checkpointMode;
}

/** Whether idle/interval autosnaps may run for the current prefs. */
export function autosnapEnabled(prefs: HistoryPrefs = loadHistoryPrefs()): boolean {
  return prefs.checkpointMode === "automatic";
}

export function loadHistoryPrefs(): HistoryPrefs {
  let intervalMinutes: HistoryIntervalMinutes =
    DEFAULT_HISTORY_PREFS.intervalMinutes;
  try {
    if (typeof localStorage !== "undefined") {
      const raw = Number(localStorage.getItem(INTERVAL_MIN_KEY));
      if (isHistoryIntervalMinutes(raw)) intervalMinutes = raw;
    }
  } catch {
    // ignore
  }
  const checkpointMode = readMode();
  return {
    checkpointMode,
    idleAutosnap: readFlag(IDLE_KEY, DEFAULT_HISTORY_PREFS.idleAutosnap),
    intervalAutosnap: readFlag(
      INTERVAL_ON_KEY,
      DEFAULT_HISTORY_PREFS.intervalAutosnap,
    ),
    intervalMinutes,
  };
}

export function saveHistoryPrefs(prefs: HistoryPrefs): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(MODE_KEY, prefs.checkpointMode);
      localStorage.setItem(INTERVAL_MIN_KEY, String(prefs.intervalMinutes));
    }
  } catch {
    // ignore
  }
  writeFlag(IDLE_KEY, prefs.idleAutosnap);
  writeFlag(INTERVAL_ON_KEY, prefs.intervalAutosnap);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(HISTORY_PREFS_EVENT));
  }
}

export function saveHistoryPref<K extends keyof HistoryPrefs>(
  key: K,
  value: HistoryPrefs[K],
): void {
  const next = { ...loadHistoryPrefs(), [key]: value };
  // Switching mode keeps idle/interval flags for when Automatic returns,
  // except Manual must not fire autosnaps (enforced via autosnapEnabled).
  if (key === "checkpointMode" && value === "automatic") {
    // Ensure at least idle is on when entering Automatic with both off.
    if (!next.idleAutosnap && !next.intervalAutosnap) {
      next.idleAutosnap = true;
    }
  }
  saveHistoryPrefs(next);
}

/** Set mode and persist; used by History header + Preferences. */
export function setCheckpointMode(mode: CheckpointMode): HistoryPrefs {
  saveHistoryPref("checkpointMode", mode);
  return loadHistoryPrefs();
}
