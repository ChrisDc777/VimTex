import { createRequire } from "node:module";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const require = createRequire(import.meta.url);
const {
  verifyPassword,
  createAuthToken,
} = require("../../../../../scripts/y-ws/room-auth.js") as {
  verifyPassword: (password: string, stored: string | null | undefined) => boolean;
  createAuthToken: (roomId: string) => string;
};
const {
  readRoomMeta,
  isRoomExpired,
} = require("../../../../../scripts/y-ws/room-meta.js") as {
  readRoomMeta: (roomId: string) => {
    passwordHash: string | null;
    expiresAt: number | null;
  } | null;
  isRoomExpired: (meta: { expiresAt: number | null } | null) => boolean;
};

const ROOM_ID_PATTERN = /^[a-zA-Z0-9_-]{4,64}$/;

type RouteContext = {
  params: Promise<{ roomId: string }>;
};

export async function POST(req: Request, context: RouteContext) {
  const roomId = decodeURIComponent((await context.params).roomId ?? "").trim();
  if (!ROOM_ID_PATTERN.test(roomId)) {
    return NextResponse.json({ error: "Invalid room id." }, { status: 400 });
  }

  const meta = readRoomMeta(roomId);
  if (isRoomExpired(meta)) {
    return NextResponse.json({ error: "This room has expired." }, { status: 410 });
  }
  if (!meta?.passwordHash) {
    return NextResponse.json({
      authToken: null,
      requiresPassword: false,
    });
  }

  let body: { password?: string };
  try {
    body = (await req.json()) as { password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (!verifyPassword(password, meta.passwordHash)) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  return NextResponse.json({
    authToken: createAuthToken(roomId),
    requiresPassword: true,
  });
}
