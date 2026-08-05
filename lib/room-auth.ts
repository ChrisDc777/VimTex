/**
 * Client helpers for room capability tokens.
 * HMAC mint/verify live in `scripts/y-ws/room-auth.js` (Node crypto);
 * Next API routes require that module. Browser only reads URL params / session.
 */

/** Query param for a read-only view capability token. */
export const VIEW_TOKEN_PARAM = "view";
/** Query param for the opaque guest edit capability. */
export const EDIT_SECRET_PARAM = "edit";

function editStorageKey(roomId: string): string {
  return `vimtex:roomEdit:${roomId}`;
}

export function readViewTokenFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const token = new URLSearchParams(window.location.search)
    .get(VIEW_TOKEN_PARAM)
    ?.trim();
  return token || null;
}

export function readEditSecretFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const edit = new URLSearchParams(window.location.search)
    .get(EDIT_SECRET_PARAM)
    ?.trim();
  return edit || null;
}

export function loadEditSecret(roomId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(editStorageKey(roomId));
  } catch {
    return null;
  }
}

export function saveEditSecret(roomId: string, edit: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(editStorageKey(roomId), edit);
  } catch {
    // ignore
  }
}

export function clearEditSecret(roomId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(editStorageKey(roomId));
  } catch {
    // ignore
  }
}

/**
 * Resolve edit capability from the URL only.
 * Stripping `?edit=` must revoke access — do not fall back to sessionStorage.
 * When present in the URL, mirror into sessionStorage for Share mint requests.
 */
export function resolveEditSecret(roomId: string): string | null {
  const fromUrl = readEditSecretFromLocation();
  if (fromUrl) {
    saveEditSecret(roomId, fromUrl);
    return fromUrl;
  }
  clearEditSecret(roomId);
  return null;
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
  const view = opts?.viewToken?.trim();
  if (view) {
    url.searchParams.set(VIEW_TOKEN_PARAM, view);
    url.searchParams.delete(EDIT_SECRET_PARAM);
  } else {
    url.searchParams.delete(VIEW_TOKEN_PARAM);
    const edit = opts?.editSecret?.trim();
    if (edit) {
      url.searchParams.set(EDIT_SECRET_PARAM, edit);
    } else {
      url.searchParams.delete(EDIT_SECRET_PARAM);
    }
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
