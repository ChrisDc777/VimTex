/**
 * Per-room guest capabilities stored in localStorage so Recent Rooms can
 * reopen after a browser restart. Separate from the recent-room list.
 *
 * Clearing site data still loses guest ownership — there is no account.
 */

const ACCESS_KEY = "vimtex:roomAccess";
const SESSION_EDIT_PREFIX = "vimtex:roomEdit:";

export type RoomAccessRecord = {
  edit?: string;
  view?: string;
};

function loadAll(): Record<string, RoomAccessRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(ACCESS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const out: Record<string, RoomAccessRecord> = {};
    for (const [id, value] of Object.entries(
      parsed as Record<string, unknown>,
    )) {
      if (!id || typeof value !== "object" || value == null) continue;
      const rec = value as RoomAccessRecord;
      const edit = typeof rec.edit === "string" ? rec.edit.trim() : "";
      const view = typeof rec.view === "string" ? rec.view.trim() : "";
      if (!edit && !view) continue;
      out[id] = {
        ...(edit ? { edit } : {}),
        ...(view ? { view } : {}),
      };
    }
    return out;
  } catch {
    return {};
  }
}

function saveAll(all: Record<string, RoomAccessRecord>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACCESS_KEY, JSON.stringify(all));
  } catch {
    // Quota or private browsing — ignore.
  }
}

export function loadRoomAccess(roomId: string): RoomAccessRecord | null {
  const id = roomId.trim();
  if (!id) return null;
  return loadAll()[id] ?? null;
}

export function saveRoomAccess(
  roomId: string,
  patch: RoomAccessRecord,
): void {
  const id = roomId.trim();
  if (!id) return;
  const all = loadAll();
  const prev = all[id] ?? {};
  const edit =
    patch.edit !== undefined
      ? patch.edit.trim()
      : (prev.edit ?? "");
  const view =
    patch.view !== undefined
      ? patch.view.trim()
      : (prev.view ?? "");
  const next: RoomAccessRecord = {};
  if (edit) next.edit = edit;
  if (view) next.view = view;
  if (!next.edit && !next.view) {
    delete all[id];
  } else {
    all[id] = next;
  }
  saveAll(all);
}

export function clearRoomAccess(roomId: string): void {
  const id = roomId.trim();
  if (!id) return;
  const all = loadAll();
  if (!(id in all)) return;
  delete all[id];
  saveAll(all);
}

export function clearAllRoomAccess(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ACCESS_KEY);
  } catch {
    // ignore
  }
}

/**
 * Move legacy sessionStorage edit secrets into localStorage once per room.
 */
export function migrateSessionEditSecret(roomId: string): string | null {
  if (typeof window === "undefined") return null;
  const id = roomId.trim();
  if (!id) return null;
  try {
    const fromSession = sessionStorage.getItem(SESSION_EDIT_PREFIX + id)?.trim();
    if (!fromSession) return loadRoomAccess(id)?.edit ?? null;
    const existing = loadRoomAccess(id);
    if (!existing?.edit) {
      saveRoomAccess(id, { edit: fromSession, view: existing?.view });
    }
    sessionStorage.removeItem(SESSION_EDIT_PREFIX + id);
    return existing?.edit || fromSession;
  } catch {
    return loadRoomAccess(id)?.edit ?? null;
  }
}
