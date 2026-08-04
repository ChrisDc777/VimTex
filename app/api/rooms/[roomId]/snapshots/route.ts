import { createRequire } from "node:module";
import { NextResponse } from "next/server";
import * as Y from "yjs";

export const runtime = "nodejs";

const require = createRequire(import.meta.url);
const { getYDoc } = require("../../../../../scripts/y-ws/utils.js") as {
  getYDoc: (name: string, gc?: boolean) => Y.Doc;
};
const {
  listSnapshots,
  createSnapshot,
} = require("../../../../../scripts/y-ws/room-snapshots.js") as {
  listSnapshots: (roomId: string) => SnapshotMeta[];
  createSnapshot: (
    roomId: string,
    update: Uint8Array,
    label?: string,
  ) => SnapshotMeta;
};

type SnapshotMeta = {
  id: string;
  roomId: string;
  label: string;
  createdAt: number;
  byteLength: number;
};

const ROOM_ID_PATTERN = /^[a-zA-Z0-9_-]{4,64}$/;

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
  return NextResponse.json({ snapshots: listSnapshots(roomId) });
}

export async function POST(req: Request, context: RouteContext) {
  const roomId = parseRoomId((await context.params).roomId);
  if (!roomId) {
    return NextResponse.json({ error: "Invalid room id." }, { status: 400 });
  }

  let label = "";
  try {
    const body = (await req.json()) as { label?: string };
    if (typeof body.label === "string") label = body.label;
  } catch {
    // empty body ok
  }

  const doc = getYDoc(roomId);
  const update = Y.encodeStateAsUpdate(doc);
  const meta = createSnapshot(roomId, update, label);
  return NextResponse.json({ snapshot: meta }, { status: 201 });
}
