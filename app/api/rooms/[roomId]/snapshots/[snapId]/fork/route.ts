import { createRequire } from "node:module";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const require = createRequire(import.meta.url);
const { forkSnapshot } = require(
  "../../../../../../../scripts/y-ws/room-snapshots.js",
) as {
  forkSnapshot: (
    roomId: string,
    snapId: string,
    opts?: { createdBy?: { name?: string; clientId?: number } },
  ) => {
    roomId: string;
    edit: string;
    snapshot: { id: string; label: string };
    sourceSnapId: string;
    charLength: number;
  } | null;
};
const {
  parseSnapshotCredentials,
  authorizeSnapshotWrite,
} = require("../../../../../../../scripts/y-ws/snapshot-access.js") as {
  parseSnapshotCredentials: (req: Request) => {
    edit?: string;
    view?: string;
    auth?: string;
  };
  authorizeSnapshotWrite: (
    roomId: string,
    creds: { edit?: string; view?: string; auth?: string },
  ) => { ok: true } | { ok: false; status: number; error: string };
};

const ROOM_ID_PATTERN = /^[a-zA-Z0-9_-]{4,64}$/;
const SNAP_ID_PATTERN = /^[a-zA-Z0-9_-]{4,64}$/;

type RouteContext = {
  params: Promise<{ roomId: string; snapId: string }>;
};

/**
 * Fork checkpoint → new room + editSecret (#128).
 * Authorship remapping after claim-guest is deferred (#37).
 */
export async function POST(req: Request, context: RouteContext) {
  const { roomId: rawRoom, snapId: rawSnap } = await context.params;
  const roomId = decodeURIComponent(rawRoom ?? "").trim();
  const snapId = decodeURIComponent(rawSnap ?? "").trim();
  if (!ROOM_ID_PATTERN.test(roomId) || !SNAP_ID_PATTERN.test(snapId)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const creds = parseSnapshotCredentials(req);
  const auth = authorizeSnapshotWrite(roomId, creds);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let createdBy: { name?: string; clientId?: number } | undefined;
  try {
    const body = (await req.json()) as {
      createdBy?: { name?: string; clientId?: number };
    };
    if (body.createdBy && typeof body.createdBy === "object") {
      createdBy = body.createdBy;
    }
  } catch {
    // empty ok
  }

  const forked = forkSnapshot(roomId, snapId, { createdBy });
  if (!forked) {
    return NextResponse.json({ error: "Snapshot not found." }, { status: 404 });
  }

  return NextResponse.json(
    {
      roomId: forked.roomId,
      edit: forked.edit,
      snapshot: forked.snapshot,
      sourceSnapId: forked.sourceSnapId,
      charLength: forked.charLength,
    },
    { status: 201 },
  );
}
