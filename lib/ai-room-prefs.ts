/**
 * Per-room AI prefs (#60) — model and temperature keyed by room id.
 * Falls back to the global chat-model storage / defaults when unset.
 *
 * Kept free of path-alias imports so node:test can load this module.
 */

export type AiRoomPrefs = {
  model?: string;
  /** 0–1 sampling temperature. Omitted → server default. */
  temperature?: number;
};

const STORAGE_PREFIX = "vimtex:aiRoom:";
export const AI_ROOM_PREFS_EVENT = "vimtex:ai-room-prefs";

export const DEFAULT_AI_TEMPERATURE = 0.4;
export const MIN_AI_TEMPERATURE = 0;
export const MAX_AI_TEMPERATURE = 1;

/** Keep in sync with DEFAULT_AI_MODEL in ai-providers.ts */
const FALLBACK_MODEL = "deepseek-v4-flash-free";

function storageKey(roomId: string): string {
  const safe = roomId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
  return `${STORAGE_PREFIX}${safe || "room"}`;
}

function clampTemperature(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_AI_TEMPERATURE;
  return Math.min(MAX_AI_TEMPERATURE, Math.max(MIN_AI_TEMPERATURE, value));
}

export function normalizeAiTemperature(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return clampTemperature(value);
}

function sanitizeModel(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const id = raw.trim();
  if (!id || id.length > 128 || /\s/.test(id)) return undefined;
  return id;
}

export function loadAiRoomPrefs(roomId: string | null | undefined): AiRoomPrefs {
  if (!roomId || typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(storageKey(roomId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as AiRoomPrefs;
    if (!parsed || typeof parsed !== "object") return {};
    return {
      model: sanitizeModel(parsed.model),
      temperature: normalizeAiTemperature(parsed.temperature),
    };
  } catch {
    return {};
  }
}

export function saveAiRoomPrefs(
  roomId: string,
  patch: AiRoomPrefs,
): AiRoomPrefs {
  const prev = loadAiRoomPrefs(roomId);
  const next: AiRoomPrefs = { ...prev };
  if (patch.model !== undefined) {
    next.model = sanitizeModel(patch.model);
  }
  if (patch.temperature !== undefined) {
    next.temperature = normalizeAiTemperature(patch.temperature);
  }
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(storageKey(roomId), JSON.stringify(next));
    }
  } catch {
    // ignore
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(AI_ROOM_PREFS_EVENT, { detail: { roomId } }),
    );
  }
  return next;
}

/** Resolve model for a room: room override → fallback → app default. */
export function resolveAiRoomModel(
  roomId: string | null | undefined,
  fallback?: string | null,
): string {
  const room = loadAiRoomPrefs(roomId).model;
  if (room) return room;
  if (fallback && sanitizeModel(fallback)) return fallback;
  return FALLBACK_MODEL;
}
