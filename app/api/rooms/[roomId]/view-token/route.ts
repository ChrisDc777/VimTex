import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ROOM_ID_PATTERN = /^[a-zA-Z0-9_-]{4,64}$/;

type RouteContext = {
  params: Promise<{ roomId: string }>;
};

/**
 * Deprecated: unauthenticated GET minted view tokens for anyone who knew
 * the room id. Mint through authenticated POST …/capabilities with
 * includeViewToken instead.
 */
export async function GET(_req: Request, context: RouteContext) {
  const { roomId: raw } = await context.params;
  const roomId = decodeURIComponent(raw ?? "").trim();
  if (!ROOM_ID_PATTERN.test(roomId)) {
    return NextResponse.json({ error: "Invalid room id." }, { status: 400 });
  }

  return NextResponse.json(
    {
      error:
        "View tokens are no longer minted from GET /view-token. Use POST /api/rooms/:id/capabilities with includeViewToken and an edit capability.",
      roomId,
    },
    { status: 410 },
  );
}
