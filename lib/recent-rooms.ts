/**
 * Local-only list of recently visited rooms, so the same session is one click
 * away after a refresh or a return visit. Stored in localStorage — never sent
 * to the server, so it stays consistent with the privacy-first product stance.
 */

import {
  clearAllRoomAccess,
  clearRoomAccess,
} from "./room-access.ts";

const RECENT_ROOMS_KEY = "vimtex:recentRooms";
const MAX_RECENT_ROOMS = 8;

export type RecentRoom = {
  id: string;
  at: number;
};

export function loadRecentRooms(): RecentRoom[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_ROOMS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (r): r is RecentRoom =>
          typeof r === "object" &&
          r != null &&
          typeof (r as RecentRoom).id === "string" &&
          (r as RecentRoom).id.length > 0 &&
          typeof (r as RecentRoom).at === "number",
      )
      .slice(0, MAX_RECENT_ROOMS);
  } catch {
    return [];
  }
}

function saveRecentRooms(rooms: RecentRoom[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      RECENT_ROOMS_KEY,
      JSON.stringify(rooms.slice(0, MAX_RECENT_ROOMS)),
    );
  } catch {
    // Quota or private browsing — ignore.
  }
}

/** Move a room to the front of the recent list (dedupe + cap). */
export function recordRecentRoom(id: string): void {
  const room = id.trim();
  if (!room) return;
  const next = [
    { id: room, at: Date.now() },
    ...loadRecentRooms().filter((r) => r.id !== room),
  ];
  saveRecentRooms(next);
}

export function removeRecentRoom(id: string): void {
  saveRecentRooms(loadRecentRooms().filter((r) => r.id !== id));
  clearRoomAccess(id);
}

export function clearRecentRooms(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(RECENT_ROOMS_KEY);
  } catch {
    // ignore
  }
  clearAllRoomAccess();
}
