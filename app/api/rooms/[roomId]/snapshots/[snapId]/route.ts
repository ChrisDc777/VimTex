import { createRequire } from "node:module";
import { NextResponse } from "next/server";
import * as Y from "yjs";

export const runtime = "nodejs";

const require = createRequire(import.meta.url);
const {
  readSnapshotUpdate,
  readSnapshotText,
  deleteSnapshot,
  listSnapshots,
  createSnapshot,
} = require("../../../../../../scripts/y-ws/room-snapshots.js") as {
  readSnapshotUpdate: (roomId: string, id: string) => Uint8Array | null;
  readSnapshotText: (roomId: string, id: string) => string | null;
  deleteSnapshot: (roomId: string, id: string) => boolean;
  listSnapshots: (roomId: string) => Array<{ id: string }>;
  createSnapshot: (
    roomId: string,
    update: Uint8Array,
    label?: string,
    opts?: { kind?: string; skipDedupe?: boolean },
  ) => SnapshotMeta;
};
const {
  parseSnapshotCredentials,
  authorizeSnapshotRead,
  authorizeSnapshotWrite,
} = require("../../../../../../scripts/y-ws/snapshot-access.js") as {
  parseSnapshotCredentials: (req: Request) => SnapshotCredentials;
  authorizeSnapshotRead: (
    roomId: string,
    creds: SnapshotCredentials,
  ) => AuthResult;
  authorizeSnapshotWrite: (
    roomId: string,
    creds: SnapshotCredentials,
  ) => AuthResult;
};

type SnapshotMeta = {
  id: string;
  roomId: string;
  label: string;
  createdAt: number;
  byteLength: number;
  kind?: string;
  contentHash?: string;
  charLength?: number;
};

type SnapshotCredentials = {
  edit?: string;
  view?: string;
  auth?: string;
};

type AuthResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

const ROOM_ID_PATTERN = /^[a-zA-Z0-9_-]{4,64}$/;
const SNAP_ID_PATTERN = /^[a-zA-Z0-9_-]{4,64}$/;

type RouteContext = {
  params: Promise<{ roomId: string; snapId: string }>;
};

function findSnapshotMeta(
  roomId: string,
  snapId: string,
): SnapshotMeta | null {
  return (
    listSnapshots(roomId).find((s) => s.id === snapId) as SnapshotMeta | null
  ) ?? null;
}

export async function GET(_req: Request, context: RouteContext) {
  const { roomId: rawRoom, snapId: rawSnap } = await context.params;
  const roomId = decodeURIComponent(rawRoom ?? "").trim();
  const snapId = decodeURIComponent(rawSnap ?? "").trim();
  if (!ROOM_ID_PATTERN.test(roomId) || !SNAP_ID_PATTERN.test(snapId)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const creds = parseSnapshotCredentials(_req);
  const auth = authorizeSnapshotRead(roomId, creds);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const meta = findSnapshotMeta(roomId, snapId);
  if (!meta) {
    return NextResponse.json({ error: "Snapshot not found." }, { status: 404 });
  }
  const text = readSnapshotText(roomId, snapId);
  if (text == null) {
    return NextResponse.json({ error: "Snapshot not found." }, { status: 404 });
  }
  return NextResponse.json({ meta, text, length: text.length });
}

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

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "restore";

  if (action === "delete") {
    if (!deleteSnapshot(roomId, snapId)) {
      return NextResponse.json({ error: "Snapshot not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, snapshots: listSnapshots(roomId) });
  }

  let checkpointCurrent = false;
  let currentText: string | undefined;
  try {
    const body = (await req.json()) as {
      checkpointCurrent?: boolean;
      currentText?: string;
    };
    checkpointCurrent = Boolean(body.checkpointCurrent);
    if (typeof body.currentText === "string") currentText = body.currentText;
  } catch {
    // empty body ok
  }

  if (checkpointCurrent && typeof currentText === "string") {
    const preDoc = new Y.Doc();
    try {
      if (currentText.length > 0) {
        preDoc.getText("codemirror").insert(0, currentText);
      }
      const update = Y.encodeStateAsUpdate(preDoc);
      createSnapshot(roomId, update, "Pre-restore checkpoint", {
        kind: "pre_restore",
        skipDedupe: true,
      });
    } finally {
      preDoc.destroy();
    }
  }

  const update = readSnapshotUpdate(roomId, snapId);
  if (!update) {
    return NextResponse.json({ error: "Snapshot not found." }, { status: 404 });
  }

  const snapshotDoc = new Y.Doc();
  Y.applyUpdate(snapshotDoc, update);
  const restoredText = snapshotDoc.getText("codemirror").toString();
  snapshotDoc.destroy();

  return NextResponse.json({
    ok: true,
    text: restoredText,
    length: restoredText.length,
  });
}

export async function DELETE(req: Request, context: RouteContext) {
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

  if (!deleteSnapshot(roomId, snapId)) {
    return NextResponse.json({ error: "Snapshot not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
