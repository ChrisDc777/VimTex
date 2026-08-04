/** Client helpers for room password + TTL metadata (#24). */

export type RoomMetaPublic = {
  roomId: string;
  requiresPassword: boolean;
  expiresAt: number | null;
  expired: boolean;
  createdAt?: number | null;
};

export type RoomTtlPreset = "never" | "1h" | "24h" | "7d" | "30d";

export const ROOM_TTL_OPTIONS: Array<{ value: RoomTtlPreset; label: string }> = [
  { value: "never", label: "No expiry" },
  { value: "1h", label: "1 hour" },
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

function authStorageKey(roomId: string): string {
  return `vimtex:roomAuth:${roomId}`;
}

export function loadRoomAuthToken(roomId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(authStorageKey(roomId));
  } catch {
    return null;
  }
}

export function saveRoomAuthToken(roomId: string, token: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(authStorageKey(roomId), token);
  } catch {
    // ignore
  }
}

export function clearRoomAuthToken(roomId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(authStorageKey(roomId));
  } catch {
    // ignore
  }
}

export async function fetchRoomMeta(roomId: string): Promise<RoomMetaPublic> {
  const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/meta`);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || `Failed to load room meta (${res.status})`);
  }
  return (await res.json()) as RoomMetaPublic;
}

export async function unlockRoom(
  roomId: string,
  password: string,
): Promise<string> {
  const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/unlock`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const body = (await res.json().catch(() => null)) as {
    error?: string;
    authToken?: string | null;
  } | null;
  if (!res.ok) {
    throw new Error(body?.error || `Unlock failed (${res.status})`);
  }
  if (!body?.authToken) {
    throw new Error("Unlock response missing auth token");
  }
  saveRoomAuthToken(roomId, body.authToken);
  return body.authToken;
}

export async function patchRoomMeta(
  roomId: string,
  patch: {
    password?: string | null;
    clearPassword?: boolean;
    ttl?: RoomTtlPreset;
  },
): Promise<RoomMetaPublic & { authToken?: string }> {
  const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/meta`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
  const body = (await res.json().catch(() => null)) as
    | (RoomMetaPublic & { authToken?: string; error?: string })
    | null;
  if (!res.ok) {
    throw new Error(body?.error || `Failed to update room (${res.status})`);
  }
  if (body?.authToken) {
    saveRoomAuthToken(roomId, body.authToken);
  }
  if (patch.clearPassword) {
    clearRoomAuthToken(roomId);
  }
  return body as RoomMetaPublic & { authToken?: string };
}
