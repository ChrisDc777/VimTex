/**
 * Client helpers for room capability tokens.
 * HMAC mint/verify live in `scripts/y-ws/room-auth.js` (Node crypto);
 * Next API routes require that module. Browser only reads URL params / storage.
 *
 * Share links put `edit` / `view` in the URL fragment so Vercel/CDN access
 * logs do not retain them. Legacy `?edit=` / `?view=` query tokens are
 * captured, persisted, and stripped on load.
 */

import { writeRoomToLocation } from "@/lib/collab";
import {
  clearRoomAccess,
  loadRoomAccess,
  migrateSessionEditSecret,
  saveRoomAccess,
} from "@/lib/room-access";

/** Query/fragment key for a read-only view capability token. */
export const VIEW_TOKEN_PARAM = "view";
/** Query/fragment key for the opaque guest edit capability. */
export const EDIT_SECRET_PARAM = "edit";

function parseHashParams(hash: string): URLSearchParams {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  return new URLSearchParams(raw);
}

function readCapsFromUrl(): { edit: string | null; view: string | null } {
  if (typeof window === "undefined") return { edit: null, view: null };
  const url = new URL(window.location.href);
  const hash = parseHashParams(url.hash);
  const queryView = url.searchParams.get(VIEW_TOKEN_PARAM)?.trim() || "";
  const queryEdit = url.searchParams.get(EDIT_SECRET_PARAM)?.trim() || "";
  const hashView = hash.get(VIEW_TOKEN_PARAM)?.trim() || "";
  const hashEdit = hash.get(EDIT_SECRET_PARAM)?.trim() || "";
  const view = hashView || queryView || null;
  const edit = view ? null : hashEdit || queryEdit || null;
  return { edit, view };
}

function stripLegacyQueryTokens(): boolean {
  if (typeof window === "undefined") return false;
  const url = new URL(window.location.href);
  const hadQuery =
    url.searchParams.has(EDIT_SECRET_PARAM) ||
    url.searchParams.has(VIEW_TOKEN_PARAM);
  if (!hadQuery) return false;
  url.searchParams.delete(EDIT_SECRET_PARAM);
  url.searchParams.delete(VIEW_TOKEN_PARAM);
  window.history.replaceState({}, "", url.toString());
  return true;
}

function writeHashCaps(opts: {
  edit?: string | null;
  view?: string | null;
}): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const hash = new URLSearchParams();
  const view = opts.view?.trim();
  const edit = opts.edit?.trim();
  if (view) {
    hash.set(VIEW_TOKEN_PARAM, view);
  } else if (edit) {
    hash.set(EDIT_SECRET_PARAM, edit);
  }
  const next = hash.toString();
  const current = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  if (current === next) return;
  url.hash = next;
  window.history.replaceState({}, "", url.toString());
}

export function readViewTokenFromLocation(): string | null {
  return readCapsFromUrl().view;
}

export function readEditSecretFromLocation(): string | null {
  return readCapsFromUrl().edit;
}

export function loadEditSecret(roomId: string): string | null {
  if (typeof window === "undefined") return null;
  migrateSessionEditSecret(roomId);
  return loadRoomAccess(roomId)?.edit ?? null;
}

export function saveEditSecret(roomId: string, edit: string): void {
  saveRoomAccess(roomId, { edit });
}

export function clearEditSecret(roomId: string): void {
  clearRoomAccess(roomId);
}

/**
 * Capture fragment + legacy query capabilities, persist them, strip query
 * tokens, and restore stored access when the URL has neither cap.
 * View links win over stored edit for this tab.
 */
export function hydrateRoomCapabilities(roomId: string): {
  editSecret: string | null;
  viewToken: string | null;
} {
  if (typeof window === "undefined" || !roomId.trim()) {
    return { editSecret: null, viewToken: null };
  }
  migrateSessionEditSecret(roomId);
  const fromUrl = readCapsFromUrl();
  stripLegacyQueryTokens();

  if (fromUrl.view) {
    const stored = loadRoomAccess(roomId);
    saveRoomAccess(roomId, {
      view: fromUrl.view,
      edit: stored?.edit,
    });
    writeHashCaps({ view: fromUrl.view });
    return { editSecret: null, viewToken: fromUrl.view };
  }

  if (fromUrl.edit) {
    saveRoomAccess(roomId, { edit: fromUrl.edit });
    writeHashCaps({ edit: fromUrl.edit });
    return { editSecret: fromUrl.edit, viewToken: null };
  }

  const stored = loadRoomAccess(roomId);
  if (stored?.edit) {
    writeHashCaps({ edit: stored.edit });
    return { editSecret: stored.edit, viewToken: null };
  }
  if (stored?.view) {
    writeHashCaps({ view: stored.view });
    return { editSecret: null, viewToken: stored.view };
  }

  writeHashCaps({});
  return { editSecret: null, viewToken: null };
}

/**
 * Resolve edit capability for this tab.
 * A view token in the URL keeps the tab read-only even if edit is stored.
 */
export function resolveEditSecret(roomId: string): string | null {
  const fromUrl = readCapsFromUrl();
  if (fromUrl.view) return null;
  if (fromUrl.edit) {
    saveEditSecret(roomId, fromUrl.edit);
    return fromUrl.edit;
  }
  return loadEditSecret(roomId);
}

/**
 * Mint edit capability for a room this client just created.
 * Call only on create paths (`/` with no room, New room/tab) — never when
 * opening an existing `?room=` (e.g. after stripping a view link).
 */
export async function mintEditCapabilityForNewRoom(
  roomId: string,
): Promise<{ edit: string }> {
  const caps = await ensureRoomCapabilities(roomId, { edit: null });
  writeRoomToLocation(roomId, {
    editSecret: caps.edit,
    clearViewToken: true,
  });
  return { edit: caps.edit };
}

export function buildRoomUrl(
  roomId: string,
  opts?: {
    viewToken?: string | null;
    editSecret?: string | null;
    origin?: string;
  },
): string {
  const base =
    opts?.origin ??
    (typeof window !== "undefined" ? window.location.href : "http://localhost");
  const url = new URL(base);
  url.searchParams.set("room", roomId);
  url.searchParams.delete(VIEW_TOKEN_PARAM);
  url.searchParams.delete(EDIT_SECRET_PARAM);
  const view = opts?.viewToken?.trim();
  const edit = opts?.editSecret?.trim();
  const hash = new URLSearchParams();
  if (view) {
    hash.set(VIEW_TOKEN_PARAM, view);
  } else if (edit) {
    hash.set(EDIT_SECRET_PARAM, edit);
  }
  url.hash = hash.toString();
  return url.toString();
}

/** @deprecated Use ensureRoomCapabilities(..., { includeViewToken: true }). */
export async function fetchViewToken(roomId: string): Promise<string> {
  const caps = await ensureRoomCapabilities(roomId, {
    edit: resolveEditSecret(roomId),
    includeViewToken: true,
  });
  if (!caps.viewToken) throw new Error("View token missing from response");
  return caps.viewToken;
}

export type EnsureCapabilitiesResult = {
  edit: string;
  viewToken?: string;
  upgraded: boolean;
  hasEditAcl: boolean;
};

/**
 * Ensure the room has an edit secret (legacy upgrade) and return capabilities
 * for the current editor. Pass `edit` when ACL is already enabled.
 */
export async function ensureRoomCapabilities(
  roomId: string,
  opts?: { edit?: string | null; includeViewToken?: boolean },
): Promise<EnsureCapabilitiesResult> {
  const res = await fetch(
    `/api/rooms/${encodeURIComponent(roomId)}/capabilities`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        edit: opts?.edit ?? resolveEditSecret(roomId),
        includeViewToken: opts?.includeViewToken ?? false,
      }),
    },
  );
  const body = (await res.json().catch(() => null)) as
    | (EnsureCapabilitiesResult & { error?: string })
    | null;
  if (!res.ok || !body?.edit) {
    throw new Error(body?.error || `Failed to ensure capabilities (${res.status})`);
  }
  saveEditSecret(roomId, body.edit);
  return {
    edit: body.edit,
    viewToken: body.viewToken,
    upgraded: Boolean(body.upgraded),
    hasEditAcl: true,
  };
}
