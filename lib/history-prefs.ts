/**
 * Version history prefs (#126) — autosnapshot idle + interval.
 * Browser-local; not a capability gate.
 */

export const HISTORY_INTERVAL_MINUTES = [5, 10, 15] as const;
export type HistoryIntervalMinutes = (typeof HISTORY_INTERVAL_MINUTES)[number];

export type HistoryPrefs = {
  /** Snapshot after the note has been idle (no local edits). */
  idleAutosnap: boolean;
  /** Snapshot on a wall-clock interval while the room is open. */
  intervalAutosnap: boolean;
  intervalMinutes: HistoryIntervalMinutes;
};

const IDLE_KEY = "vimtex:historyIdleAutosnap";
const INTERVAL_ON_KEY = "vimtex:historyIntervalAutosnap";
const INTERVAL_MIN_KEY = "vimtex:historyIntervalMinutes";

export const HISTORY_PREFS_EVENT = "vimtex:history-prefs";

export const DEFAULT_HISTORY_PREFS: HistoryPrefs = {
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
  return {
    idleAutosnap: readFlag(IDLE_KEY, DEFAULT_HISTORY_PREFS.idleAutosnap),
    intervalAutosnap: readFlag(
      INTERVAL_ON_KEY,
      DEFAULT_HISTORY_PREFS.intervalAutosnap,
    ),
    intervalMinutes,
  };
}

export function saveHistoryPrefs(prefs: HistoryPrefs): void {
  writeFlag(IDLE_KEY, prefs.idleAutosnap);
  writeFlag(INTERVAL_ON_KEY, prefs.intervalAutosnap);
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(INTERVAL_MIN_KEY, String(prefs.intervalMinutes));
    }
  } catch {
    // ignore
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(HISTORY_PREFS_EVENT));
  }
}

export function saveHistoryPref<K extends keyof HistoryPrefs>(
  key: K,
  value: HistoryPrefs[K],
): void {
  saveHistoryPrefs({ ...loadHistoryPrefs(), [key]: value });
}
