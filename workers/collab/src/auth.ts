import {
  createHmac,
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { AUTH_TTL_MS } from "./constants.ts";

export function requireRoomSecret(env: Env): string {
  const secret = env.ROOM_SECRET?.trim();
  if (!secret) {
    throw new Error("ROOM_SECRET is required");
  }
  return secret;
}

export function createViewToken(roomId: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`ro:${roomId}`, "utf8")
    .digest("base64url")
    .slice(0, 22);
}

export function verifyViewToken(
  roomId: string,
  token: string | null | undefined,
  secret: string,
): boolean {
  if (!token) return false;
  const expected = createViewToken(roomId, secret);
  return timingEqual(token, expected);
}

export function createEditSecret(): string {
  return randomBytes(24).toString("base64url");
}

export function hashEditSecret(secret: string): string {
  return `sha256:${createHash("sha256").update(secret, "utf8").digest("hex")}`;
}

export function verifyEditSecret(
  presented: string | null | undefined,
  stored: string | null | undefined,
): boolean {
  if (!presented || !stored) return false;
  if (stored.startsWith("sha256:")) {
    const actual = hashEditSecret(presented);
    return timingEqual(actual, stored);
  }
  return timingEqual(presented, stored);
}

export function createAuthToken(
  roomId: string,
  secret: string,
  ttlMs = AUTH_TTL_MS,
): string {
  const expiresAt = Date.now() + Math.max(60_000, ttlMs);
  const sig = createHmac("sha256", secret)
    .update(`auth:${roomId}:${expiresAt}`, "utf8")
    .digest("base64url")
    .slice(0, 22);
  return `${expiresAt}.${sig}`;
}

export function verifyAuthToken(
  roomId: string,
  token: string | null | undefined,
  secret: string,
): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const expiresAt = Number(parts[0]);
  const sig = parts[1];
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now() || !sig) {
    return false;
  }
  const expected = createHmac("sha256", secret)
    .update(`auth:${roomId}:${expiresAt}`, "utf8")
    .digest("base64url")
    .slice(0, 22);
  return timingEqual(sig, expected);
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(
  password: string,
  stored: string | null | undefined,
): boolean {
  if (!password || !stored) return false;
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  try {
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    const actual = scryptSync(password, salt, expected.length);
    if (actual.length !== expected.length) return false;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export type RoomCredentials = {
  edit?: string;
  view?: string;
  auth?: string;
};

export function parseCredentials(req: Request, url?: URL): RoomCredentials {
  const headers = req.headers;
  const search = url?.searchParams;
  return {
    edit:
      headers.get("x-vimtex-edit")?.trim() ||
      search?.get("edit")?.trim() ||
      undefined,
    view:
      headers.get("x-vimtex-view")?.trim() ||
      search?.get("view")?.trim() ||
      undefined,
    auth:
      headers.get("x-vimtex-auth")?.trim() ||
      search?.get("auth")?.trim() ||
      undefined,
  };
}

export type AuthResult =
  | { ok: true; role: "edit" | "view" | "legacy" }
  | { ok: false; status: number; error: string };

export function authorizeRoom(
  roomId: string,
  creds: RoomCredentials,
  meta: {
    expired: boolean;
    passwordHash: string | null;
    editSecretHash: string | null;
    editSecretLegacy: string | null;
  },
  secret: string,
  mode: "read" | "write" | "ws",
): AuthResult {
  if (meta.expired) {
    return { ok: false, status: 410, error: "This room has expired." };
  }
  if (meta.passwordHash && !verifyAuthToken(roomId, creds.auth, secret)) {
    return { ok: false, status: 401, error: "Room password required." };
  }
  const stored = meta.editSecretHash || meta.editSecretLegacy;
  if (!stored) {
    return { ok: true, role: "legacy" };
  }
  if (verifyEditSecret(creds.edit, stored)) {
    return { ok: true, role: "edit" };
  }
  if (mode !== "write" && verifyViewToken(roomId, creds.view, secret)) {
    return { ok: true, role: "view" };
  }
  return {
    ok: false,
    status: 403,
    error:
      mode === "write"
        ? "Edit capability required."
        : "View or edit capability required.",
  };
}

function timingEqual(a: string, b: string): boolean {
  try {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    if (left.length !== right.length) return false;
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}
