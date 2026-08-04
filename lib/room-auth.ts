/**
 * Client/server helpers for room capability tokens.
 * HMAC mint/verify live in `scripts/y-ws/room-auth.js` (Node crypto);
 * Next API routes require that module. Browser only reads URL params.
 */

/** Query param for a read-only view capability token. */
export const VIEW_TOKEN_PARAM = "view";

export function readViewTokenFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const token = new URLSearchParams(window.location.search)
    .get(VIEW_TOKEN_PARAM)
    ?.trim();
  return token || null;
}

export function buildRoomUrl(
  roomId: string,
  opts?: { viewToken?: string | null; origin?: string },
): string {
  const base =
    opts?.origin ??
    (typeof window !== "undefined" ? window.location.href : "http://localhost");
  const url = new URL(base);
  url.searchParams.set("room", roomId);
  const view = opts?.viewToken?.trim();
  if (view) {
    url.searchParams.set(VIEW_TOKEN_PARAM, view);
  } else {
    url.searchParams.delete(VIEW_TOKEN_PARAM);
  }
  return url.toString();
}

export async function fetchViewToken(roomId: string): Promise<string> {
  const res = await fetch(
    `/api/rooms/${encodeURIComponent(roomId)}/view-token`,
  );
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error || `Failed to mint view token (${res.status})`);
  }
  const data = (await res.json()) as { token?: string };
  if (!data.token) throw new Error("View token missing from response");
  return data.token;
}
