import { handleAiAdmit } from "./ai-admit";
import {
  createEditSecret,
  hashEditSecret,
  requireRoomSecret,
} from "./auth";
import { corsHeaders, json, originAllowed } from "./cors";
import { logEvent } from "./constants";
import { encodeCodemirror } from "./yjs-protocol";
import { RoomObject } from "./room-object";

export { RoomObject };

const ROOM_ID = /^[a-zA-Z0-9_-]{4,64}$/;
const SNAP_ID = /^[a-zA-Z0-9_-]{4,64}$/;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      requireRoomSecret(env);
    } catch {
      return json(env, request, { error: "ROOM_SECRET is not configured." }, 503);
    }

    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(env, request.headers.get("Origin")),
      });
    }

    if (url.pathname === "/healthz") {
      return json(env, request, {
        ok: true,
        service: "vimtex-collab",
        version: env.WORKER_VERSION || "dev",
      });
    }

    if (url.pathname === "/internal/ai/admit") {
      return handleAiAdmit(request, env);
    }

    const origin = request.headers.get("Origin");
    if (request.headers.get("Upgrade") === "websocket") {
      if (!originAllowed(origin, env)) {
        return json(env, request, { error: "Origin not allowed." }, 403);
      }
      const wsMatch = url.pathname.match(/^\/([a-zA-Z0-9_-]{4,64})$/);
      if (!wsMatch?.[1] || !ROOM_ID.test(wsMatch[1])) {
        return json(env, request, { error: "Invalid room id." }, 400);
      }
      const stub = env.ROOM.get(env.ROOM.idFromName(wsMatch[1]));
      return stub.fetch(request);
    }

    const api = url.pathname.match(
      /^\/api\/rooms\/([a-zA-Z0-9_-]{4,64})(?:\/(.*))?$/,
    );
    if (!api?.[1] || !ROOM_ID.test(api[1])) {
      return json(env, request, { error: "Not found." }, 404);
    }
    const roomId = api[1];
    const rest = api[2] ?? "";

    const forkMatch = rest.match(/^snapshots\/([a-zA-Z0-9_-]{4,64})\/fork$/);
    if (forkMatch && request.method === "POST") {
      return handleFork(request, env, roomId, forkMatch[1]);
    }

    const stub = env.ROOM.get(env.ROOM.idFromName(roomId));
    return stub.fetch(request);
  },
};

async function handleFork(
  request: Request,
  env: Env,
  sourceRoomId: string,
  snapId: string,
): Promise<Response> {
  if (!SNAP_ID.test(snapId)) {
    return json(env, request, { error: "Invalid id." }, 400);
  }
  const source = env.ROOM.get(env.ROOM.idFromName(sourceRoomId));
  const preview = await source.fetch(
    new Request(
      `https://room/api/rooms/${sourceRoomId}/internal/export/${snapId}`,
      {
        method: "POST",
        headers: request.headers,
      },
    ),
  );
  if (!preview.ok) {
    return new Response(preview.body, {
      status: preview.status,
      headers: preview.headers,
    });
  }
  const data = (await preview.json()) as {
    text?: string;
    meta?: { label?: string };
  };
  if (typeof data.text !== "string") {
    return json(env, request, { error: "Snapshot not found." }, 404);
  }

  let createdBy: { name?: string; clientId?: number } | undefined;
  try {
    const body = (await request.json()) as {
      createdBy?: { name?: string; clientId?: number };
    };
    if (body.createdBy && typeof body.createdBy === "object") {
      createdBy = body.createdBy;
    }
  } catch {
    // empty ok
  }

  const newRoomId = crypto.getRandomValues(new Uint8Array(8)).reduce(
    (acc, b) => acc + b.toString(16).padStart(2, "0"),
    "",
  );
  const edit = createEditSecret();
  const dest = env.ROOM.get(env.ROOM.idFromName(newRoomId));
  const update = encodeCodemirror(data.text);
  const updateBase64 = bytesToBase64(update);
  const internal =
    env.AI_ADMISSION_SECRET?.trim() || requireRoomSecret(env);
  const boot = await dest.fetch(
    new Request(`https://room/api/rooms/${newRoomId}/internal/bootstrap`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-vimtex-internal": internal,
      },
      body: JSON.stringify({
        editSecretHash: hashEditSecret(edit),
        updateBase64,
        snapshot: {
          label: `Forked from ${data.meta?.label || "checkpoint"}`.slice(0, 80),
          kind: "named",
          createdBy,
        },
      }),
    }),
  );
  if (!boot.ok) {
    logEvent("vimtex.snapshot", { action: "fork", ok: false });
    return json(env, request, { error: "Could not create forked room." }, 500);
  }
  const bootBody = (await boot.json()) as {
    snapshot?: { id: string; label: string };
  };
  logEvent("vimtex.snapshot", {
    action: "fork",
    ok: true,
    charLength: data.text.length,
  });
  return json(
    env,
    request,
    {
      roomId: newRoomId,
      edit,
      snapshot: bootBody.snapshot || { id: "fork", label: "Forked" },
      sourceSnapId: snapId,
      charLength: data.text.length,
    },
    201,
  );
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
