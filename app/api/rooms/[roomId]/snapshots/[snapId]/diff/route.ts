import { createRequire } from "node:module";
import { NextResponse } from "next/server";
import { diffLines, summarizeDiff } from "@/lib/text-diff";

export const runtime = "nodejs";

const require = createRequire(import.meta.url);
const { readSnapshotText } = require(
  "../../../../../../../scripts/y-ws/room-snapshots.js",
) as {
  readSnapshotText: (roomId: string, id: string) => string | null;
};
const {
  parseSnapshotCredentials,
  authorizeSnapshotRead,
} = require("../../../../../../../scripts/y-ws/snapshot-access.js") as {
  parseSnapshotCredentials: (req: Request) => SnapshotCredentials;
  authorizeSnapshotRead: (
    roomId: string,
    creds: SnapshotCredentials,
  ) => AuthResult;
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

export async function POST(req: Request, context: RouteContext) {
  const { roomId: rawRoom, snapId: rawSnap } = await context.params;
  const roomId = decodeURIComponent(rawRoom ?? "").trim();
  const snapId = decodeURIComponent(rawSnap ?? "").trim();
  if (!ROOM_ID_PATTERN.test(roomId) || !SNAP_ID_PATTERN.test(snapId)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const creds = parseSnapshotCredentials(req);
  const auth = authorizeSnapshotRead(roomId, creds);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(req.url);
  const against = url.searchParams.get("against") || "live";

  const snapText = readSnapshotText(roomId, snapId);
  if (snapText == null) {
    return NextResponse.json({ error: "Snapshot not found." }, { status: 404 });
  }

  let compareText = "";
  if (against === "live") {
    let body: { liveText?: string };
    try {
      body = (await req.json()) as { liveText?: string };
    } catch {
      return NextResponse.json({ error: "liveText required." }, { status: 400 });
    }
    if (typeof body.liveText !== "string") {
      return NextResponse.json({ error: "liveText required." }, { status: 400 });
    }
    compareText = body.liveText;
  } else {
    const otherText = readSnapshotText(roomId, against);
    if (otherText == null) {
      return NextResponse.json(
        { error: "Comparison snapshot not found." },
        { status: 404 },
      );
    }
    compareText = otherText;
  }

  const before = against === "live" ? snapText : compareText;
  const after = against === "live" ? compareText : snapText;
  const lines = diffLines(before, after);
  const summary = summarizeDiff(lines);
  const truncated =
    lines.some((l) => l.kind === "del" && l.beforeLine === 1) &&
    lines.length > 500;

  return NextResponse.json({
    summary: { ...summary, truncated },
    lines: truncated ? undefined : lines,
  });
}
