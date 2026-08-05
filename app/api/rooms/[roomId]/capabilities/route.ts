import { createRequire } from "node:module";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const require = createRequire(import.meta.url);
const {
  createEditSecret,
  verifyEditSecret,
  createViewToken,
} = require("../../../../../scripts/y-ws/room-auth.js") as {
  createEditSecret: () => string;
  verifyEditSecret: (
    presented: string | null | undefined,
    stored: string | null | undefined,
  ) => boolean;
  createViewToken: (roomId: string) => string;
};
const {
  readRoomMeta,
  upsertRoomMeta,
  isRoomExpired,
} = require("../../../../../scripts/y-ws/room-meta.js") as {
  readRoomMeta: (roomId: string) => {
    editSecret: string | null;
    expiresAt: number | null;
    passwordHash: string | null;
  } | null;
  upsertRoomMeta: (
    roomId: string,
    patch: { editSecret?: string | null },
  ) => { editSecret: string | null };
  isRoomExpired: (meta: { expiresAt: number | null } | null) => boolean;
};

const ROOM_ID_PATTERN = /^[a-zA-Z0-9_-]{4,64}$/;

type RouteContext = {
  params: Promise<{ roomId: string }>;
};

type Body = {
  /** Present current edit secret when ACL is already enabled. */
  edit?: string | null;
  /** Also mint a view token in the same response. */
  includeViewToken?: boolean;
};

/**
 * Ensure / return guest edit capability for a room.
 *
 * - No editSecret yet (legacy): mint one (room-id holders can upgrade once).
 * - editSecret exists: require a matching `edit` in the body to retrieve it.
 */
export async function POST(req: Request, context: RouteContext) {
  const roomId = decodeURIComponent((await context.params).roomId ?? "").trim();
  if (!ROOM_ID_PATTERN.test(roomId)) {
    return NextResponse.json({ error: "Invalid room id." }, { status: 400 });
  }

  const meta = readRoomMeta(roomId);
  if (isRoomExpired(meta)) {
    return NextResponse.json({ error: "This room has expired." }, { status: 410 });
  }

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    // empty body ok for legacy bootstrap
  }

  const presented =
    typeof body.edit === "string" && body.edit.trim()
      ? body.edit.trim()
      : null;

  let editSecret = meta?.editSecret ?? null;
  let upgraded = false;

  if (!editSecret) {
    editSecret = createEditSecret();
    upsertRoomMeta(roomId, { editSecret });
    upgraded = true;
  } else if (!verifyEditSecret(presented, editSecret)) {
    return NextResponse.json(
      {
        error:
          "Edit capability required. Open an edit link or share from a tab that already has edit access.",
        hasEditAcl: true,
      },
      { status: 403 },
    );
  }

  const payload: {
    roomId: string;
    edit: string;
    hasEditAcl: true;
    upgraded: boolean;
    viewToken?: string;
  } = {
    roomId,
    edit: editSecret,
    hasEditAcl: true,
    upgraded,
  };

  if (body.includeViewToken) {
    payload.viewToken = createViewToken(roomId);
  }

  return NextResponse.json(payload);
}

export async function GET(_req: Request, context: RouteContext) {
  const roomId = decodeURIComponent((await context.params).roomId ?? "").trim();
  if (!ROOM_ID_PATTERN.test(roomId)) {
    return NextResponse.json({ error: "Invalid room id." }, { status: 400 });
  }
  const meta = readRoomMeta(roomId);
  return NextResponse.json({
    roomId,
    hasEditAcl: Boolean(meta?.editSecret),
    requiresPassword: Boolean(meta?.passwordHash),
    expired: isRoomExpired(meta),
  });
}
