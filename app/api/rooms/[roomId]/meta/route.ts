import { createRequire } from "node:module";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const require = createRequire(import.meta.url);
const {
  hashPassword,
  createAuthToken,
} = require("../../../../../scripts/y-ws/room-auth.js") as {
  hashPassword: (password: string) => string;
  createAuthToken: (roomId: string) => string;
};
const {
  readRoomMeta,
  upsertRoomMeta,
  isRoomExpired,
} = require("../../../../../scripts/y-ws/room-meta.js") as {
  readRoomMeta: (roomId: string) => RoomMeta | null;
  upsertRoomMeta: (
    roomId: string,
    patch: Record<string, unknown>,
  ) => RoomMeta;
  isRoomExpired: (meta: RoomMeta | null) => boolean;
};

type RoomMeta = {
  roomId: string;
  createdAt: number;
  updatedAt: number;
  expiresAt: number | null;
  passwordHash: string | null;
  editSecret: string | null;
};

const ROOM_ID_PATTERN = /^[a-zA-Z0-9_-]{4,64}$/;

const TTL_PRESETS_MS: Record<string, number | null> = {
  never: null,
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

type RouteContext = {
  params: Promise<{ roomId: string }>;
};

function parseRoomId(raw: string | undefined): string | null {
  const roomId = decodeURIComponent(raw ?? "").trim();
  return ROOM_ID_PATTERN.test(roomId) ? roomId : null;
}

export async function GET(_req: Request, context: RouteContext) {
  const roomId = parseRoomId((await context.params).roomId);
  if (!roomId) {
    return NextResponse.json({ error: "Invalid room id." }, { status: 400 });
  }
  const meta = readRoomMeta(roomId);
  return NextResponse.json({
    roomId,
    requiresPassword: Boolean(meta?.passwordHash),
    hasEditAcl: Boolean(meta?.editSecret),
    expiresAt: meta?.expiresAt ?? null,
    expired: isRoomExpired(meta),
    createdAt: meta?.createdAt ?? null,
  });
}

type MetaBody = {
  password?: string | null;
  clearPassword?: boolean;
  ttl?: string | null;
  expiresAt?: number | null;
};

export async function PATCH(req: Request, context: RouteContext) {
  const roomId = parseRoomId((await context.params).roomId);
  if (!roomId) {
    return NextResponse.json({ error: "Invalid room id." }, { status: 400 });
  }

  let body: MetaBody;
  try {
    body = (await req.json()) as MetaBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const patch: {
    passwordHash?: string | null;
    expiresAt?: number | null;
  } = {};

  if (body.clearPassword) {
    patch.passwordHash = null;
  } else if (typeof body.password === "string") {
    const trimmed = body.password.trim();
    if (trimmed.length < 4 || trimmed.length > 128) {
      return NextResponse.json(
        { error: "Password must be 4–128 characters." },
        { status: 400 },
      );
    }
    patch.passwordHash = hashPassword(trimmed);
  }

  if (body.ttl != null && body.ttl !== "") {
    if (!(body.ttl in TTL_PRESETS_MS)) {
      return NextResponse.json({ error: "Unknown ttl preset." }, { status: 400 });
    }
    const ms = TTL_PRESETS_MS[body.ttl]!;
    patch.expiresAt = ms == null ? null : Date.now() + ms;
  } else if (body.expiresAt !== undefined) {
    if (body.expiresAt === null) {
      patch.expiresAt = null;
    } else if (
      typeof body.expiresAt === "number" &&
      Number.isFinite(body.expiresAt)
    ) {
      patch.expiresAt = body.expiresAt;
    } else {
      return NextResponse.json({ error: "Invalid expiresAt." }, { status: 400 });
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "No password or ttl changes provided." },
      { status: 400 },
    );
  }

  const meta = upsertRoomMeta(roomId, patch);
  // If a password was just set, mint an auth token so the setter stays unlocked.
  const authToken =
    patch.passwordHash && !body.clearPassword
      ? createAuthToken(roomId)
      : undefined;

  return NextResponse.json({
    roomId,
    requiresPassword: Boolean(meta.passwordHash),
    expiresAt: meta.expiresAt,
    expired: isRoomExpired(meta),
    authToken,
  });
}
