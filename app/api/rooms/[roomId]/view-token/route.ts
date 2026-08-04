import { createRequire } from "node:module";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const require = createRequire(import.meta.url);
const { createViewToken } = require("../../../../../scripts/y-ws/room-auth.js") as {
  createViewToken: (roomId: string) => string;
};

const ROOM_ID_PATTERN = /^[a-zA-Z0-9_-]{4,64}$/;

type RouteContext = {
  params: Promise<{ roomId: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { roomId: raw } = await context.params;
  const roomId = decodeURIComponent(raw ?? "").trim();
  if (!ROOM_ID_PATTERN.test(roomId)) {
    return NextResponse.json({ error: "Invalid room id." }, { status: 400 });
  }

  try {
    const token = createViewToken(roomId);
    return NextResponse.json({ token, roomId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Token mint failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
