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
    opts?: {
      kind?: string;
      createdBy?: { name?: string; clientId?: number };
    },
  ) => SnapshotMeta;
};
const {
  parseSnapshotCredentials,
  authorizeSnapshotRead,
  authorizeSnapshotWrite,
} = require("../../../../../scripts/y-ws/snapshot-access.js") as {
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

type SnapshotKind =
  | "manual"
  | "pre_ai"
  | "pre_restore"
  | "auto_idle"
  | "auto_interval"
  | "named";

type SnapshotMeta = {
  id: string;
  roomId: string;
  label: string;
  createdAt: number;
  byteLength: number;
  kind?: SnapshotKind;
  contentHash?: string;
  charLength?: number;
  createdBy?: { name?: string; clientId?: number };
  pinned?: boolean;
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

type RouteContext = {
  params: Promise<{ roomId: string }>;
};

function parseRoomId(raw: string | undefined): string | null {
  const roomId = decodeURIComponent(raw ?? "").trim();
  return ROOM_ID_PATTERN.test(roomId) ? roomId : null;
}

export async function GET(req: Request, context: RouteContext) {
  const roomId = parseRoomId((await context.params).roomId);
  if (!roomId) {
    return NextResponse.json({ error: "Invalid room id." }, { status: 400 });
  }
  const creds = parseSnapshotCredentials(req);
  const auth = authorizeSnapshotRead(roomId, creds);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  return NextResponse.json({ snapshots: listSnapshots(roomId) });
}

export async function POST(req: Request, context: RouteContext) {
  const roomId = parseRoomId((await context.params).roomId);
  if (!roomId) {
    return NextResponse.json({ error: "Invalid room id." }, { status: 400 });
  }
  const creds = parseSnapshotCredentials(req);
  const auth = authorizeSnapshotWrite(roomId, creds);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let label = "";
  let text: string | undefined;
  let kind: SnapshotKind | undefined;
  let createdBy: { name?: string; clientId?: number } | undefined;
  try {
    const body = (await req.json()) as {
      label?: string;
      text?: string;
      kind?: SnapshotKind;
      createdBy?: { name?: string; clientId?: number };
    };
    if (typeof body.label === "string") label = body.label;
    if (typeof body.text === "string") text = body.text;
    if (typeof body.kind === "string") kind = body.kind;
    if (body.createdBy && typeof body.createdBy === "object") {
      createdBy = body.createdBy;
    }
  } catch {
    // empty body ok
  }

  let update: Uint8Array;
  if (typeof text === "string") {
    const snapDoc = new Y.Doc();
    try {
      if (text.length > 0) {
        snapDoc.getText("codemirror").insert(0, text);
      }
      update = Y.encodeStateAsUpdate(snapDoc);
    } finally {
      snapDoc.destroy();
    }
  } else {
    const doc = getYDoc(roomId);
    update = Y.encodeStateAsUpdate(doc);
  }
  const meta = createSnapshot(roomId, update, label, { kind, createdBy });
  return NextResponse.json({ snapshot: meta }, { status: 201 });
}
