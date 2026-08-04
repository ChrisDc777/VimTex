import { createRequire } from "node:module";
import { NextResponse } from "next/server";
import * as Y from "yjs";

export const runtime = "nodejs";

const require = createRequire(import.meta.url);
const { getYDoc } = require("../../../../../../scripts/y-ws/utils.js") as {
  getYDoc: (name: string, gc?: boolean) => Y.Doc & {
    getText: (name: string) => Y.Text;
  };
};
const {
  readSnapshotUpdate,
  deleteSnapshot,
  listSnapshots,
} = require("../../../../../../scripts/y-ws/room-snapshots.js") as {
  readSnapshotUpdate: (roomId: string, id: string) => Uint8Array | null;
  deleteSnapshot: (roomId: string, id: string) => boolean;
  listSnapshots: (roomId: string) => Array<{ id: string }>;
};

const ROOM_ID_PATTERN = /^[a-zA-Z0-9_-]{4,64}$/;
const SNAP_ID_PATTERN = /^[a-zA-Z0-9_-]{4,64}$/;

type RouteContext = {
  params: Promise<{ roomId: string; snapId: string }>;
};

export async function POST(req: Request, context: RouteContext) {
  const { roomId: rawRoom, snapId: rawSnap } = await context.params;
  const roomId = decodeURIComponent(rawRoom ?? "").trim();
  const snapId = decodeURIComponent(rawSnap ?? "").trim();
  if (!ROOM_ID_PATTERN.test(roomId) || !SNAP_ID_PATTERN.test(snapId)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "restore";

  if (action === "delete") {
    if (!deleteSnapshot(roomId, snapId)) {
      return NextResponse.json({ error: "Snapshot not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, snapshots: listSnapshots(roomId) });
  }

  const update = readSnapshotUpdate(roomId, snapId);
  if (!update) {
    return NextResponse.json({ error: "Snapshot not found." }, { status: 404 });
  }

  // Replace the live doc content by applying a full-state update into a fresh
  // doc then copying the "codemirror" text (chat history is preserved).
  const snapshotDoc = new Y.Doc();
  Y.applyUpdate(snapshotDoc, update);
  const restoredText = snapshotDoc.getText("codemirror").toString();
  snapshotDoc.destroy();

  const live = getYDoc(roomId);
  const ytext = live.getText("codemirror");
  live.transact(() => {
    const len = ytext.length;
    if (len > 0) ytext.delete(0, len);
    if (restoredText.length > 0) ytext.insert(0, restoredText);
  }, "snapshot-restore");

  return NextResponse.json({ ok: true, length: restoredText.length });
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { roomId: rawRoom, snapId: rawSnap } = await context.params;
  const roomId = decodeURIComponent(rawRoom ?? "").trim();
  const snapId = decodeURIComponent(rawSnap ?? "").trim();
  if (!ROOM_ID_PATTERN.test(roomId) || !SNAP_ID_PATTERN.test(snapId)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }
  if (!deleteSnapshot(roomId, snapId)) {
    return NextResponse.json({ error: "Snapshot not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
