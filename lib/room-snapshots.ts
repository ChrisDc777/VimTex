/** Client helpers for room snapshots (#25) + Docs history panel. */

import {
  loadRoomAuthToken,
} from "./room-meta";
import {
  loadEditSecret,
  readViewTokenFromLocation,
} from "./room-auth";

export type SnapshotKind =
  | "manual"
  | "pre_ai"
  | "pre_restore"
  | "auto_idle"
  | "auto_interval"
  | "named";

export type RoomSnapshotMeta = {
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

export type SnapshotAuth = {
  editSecret?: string | null;
  viewToken?: string | null;
  authToken?: string | null;
};

export type SnapshotDiffSummary = {
  added: number;
  removed: number;
  truncated?: boolean;
};

function snapshotHeaders(auth?: SnapshotAuth): HeadersInit {
  const headers: Record<string, string> = {};
  const edit = auth?.editSecret?.trim();
  const view = auth?.viewToken?.trim();
  const sessionAuth = auth?.authToken?.trim();
  if (edit) headers["x-vimtex-edit"] = edit;
  if (view) headers["x-vimtex-view"] = view;
  if (sessionAuth) headers["x-vimtex-auth"] = sessionAuth;
  return headers;
}

/** Resolve snapshot credentials from shell session state. */
export function resolveSnapshotAuth(
  roomId: string,
  opts?: SnapshotAuth,
): SnapshotAuth {
  return {
    editSecret: opts?.editSecret ?? loadEditSecret(roomId),
    viewToken: opts?.viewToken ?? readViewTokenFromLocation(),
    authToken: opts?.authToken ?? loadRoomAuthToken(roomId),
  };
}

export async function listRoomSnapshots(
  roomId: string,
  auth?: SnapshotAuth,
  opts?: { limit?: number; offset?: number; q?: string },
): Promise<RoomSnapshotMeta[]> {
  const params = new URLSearchParams();
  if (opts?.limit != null) params.set("limit", String(opts.limit));
  if (opts?.offset != null) params.set("offset", String(opts.offset));
  if (opts?.q?.trim()) params.set("q", opts.q.trim());
  const qs = params.toString();
  const res = await fetch(
    `/api/rooms/${encodeURIComponent(roomId)}/snapshots${qs ? `?${qs}` : ""}`,
    { headers: snapshotHeaders(resolveSnapshotAuth(roomId, auth)) },
  );
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || `Failed to list snapshots (${res.status})`);
  }
  const data = (await res.json()) as { snapshots?: RoomSnapshotMeta[] };
  return data.snapshots ?? [];
}

export async function forkRoomSnapshot(
  roomId: string,
  snapId: string,
  opts?: {
    auth?: SnapshotAuth;
    createdBy?: { name?: string; clientId?: number };
  },
): Promise<{
  roomId: string;
  edit: string;
  snapshot: RoomSnapshotMeta;
  sourceSnapId: string;
  charLength: number;
}> {
  const res = await fetch(
    `/api/rooms/${encodeURIComponent(roomId)}/snapshots/${encodeURIComponent(snapId)}/fork`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...snapshotHeaders(resolveSnapshotAuth(roomId, opts?.auth)),
      },
      body: JSON.stringify({
        ...(opts?.createdBy ? { createdBy: opts.createdBy } : {}),
      }),
    },
  );
  const body = (await res.json().catch(() => null)) as {
    roomId?: string;
    edit?: string;
    snapshot?: RoomSnapshotMeta;
    sourceSnapId?: string;
    charLength?: number;
    error?: string;
  } | null;
  if (
    !res.ok ||
    typeof body?.roomId !== "string" ||
    typeof body?.edit !== "string" ||
    !body.snapshot
  ) {
    throw new Error(body?.error || `Fork failed (${res.status})`);
  }
  return {
    roomId: body.roomId,
    edit: body.edit,
    snapshot: body.snapshot,
    sourceSnapId: body.sourceSnapId ?? snapId,
    charLength: body.charLength ?? 0,
  };
}

export async function createRoomSnapshot(
  roomId: string,
  label?: string,
  /** Exact note text to checkpoint (preferred). Falls back to server Y.Doc. */
  text?: string,
  opts?: {
    auth?: SnapshotAuth;
    kind?: SnapshotKind;
    createdBy?: { name?: string; clientId?: number };
  },
): Promise<RoomSnapshotMeta> {
  const res = await fetch(
    `/api/rooms/${encodeURIComponent(roomId)}/snapshots`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...snapshotHeaders(resolveSnapshotAuth(roomId, opts?.auth)),
      },
      body: JSON.stringify({
        label: label ?? "",
        ...(typeof text === "string" ? { text } : {}),
        ...(opts?.kind ? { kind: opts.kind } : {}),
        ...(opts?.createdBy ? { createdBy: opts.createdBy } : {}),
      }),
    },
  );
  const body = (await res.json().catch(() => null)) as {
    snapshot?: RoomSnapshotMeta;
    error?: string;
  } | null;
  if (!res.ok || !body?.snapshot) {
    throw new Error(body?.error || `Failed to create snapshot (${res.status})`);
  }
  return body.snapshot;
}

export async function fetchSnapshotPreview(
  roomId: string,
  snapId: string,
  auth?: SnapshotAuth,
): Promise<{ text: string; meta: RoomSnapshotMeta }> {
  const res = await fetch(
    `/api/rooms/${encodeURIComponent(roomId)}/snapshots/${encodeURIComponent(snapId)}`,
    { headers: snapshotHeaders(resolveSnapshotAuth(roomId, auth)) },
  );
  const body = (await res.json().catch(() => null)) as {
    text?: string;
    meta?: RoomSnapshotMeta;
    error?: string;
  } | null;
  if (!res.ok || typeof body?.text !== "string" || !body.meta) {
    throw new Error(body?.error || `Failed to load snapshot (${res.status})`);
  }
  return { text: body.text, meta: body.meta };
}

export async function fetchSnapshotDiff(
  roomId: string,
  snapId: string,
  against: "live" | string,
  liveText: string,
  auth?: SnapshotAuth,
): Promise<{ summary: SnapshotDiffSummary; lines?: import("./text-diff").DiffLine[] }> {
  const res = await fetch(
    `/api/rooms/${encodeURIComponent(roomId)}/snapshots/${encodeURIComponent(snapId)}/diff?against=${encodeURIComponent(against)}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...snapshotHeaders(resolveSnapshotAuth(roomId, auth)),
      },
      body: JSON.stringify({ liveText }),
    },
  );
  const body = (await res.json().catch(() => null)) as {
    summary?: SnapshotDiffSummary;
    lines?: import("./text-diff").DiffLine[];
    error?: string;
  } | null;
  if (!res.ok || !body?.summary) {
    throw new Error(body?.error || `Failed to compare snapshot (${res.status})`);
  }
  return { summary: body.summary, lines: body.lines };
}

export async function restoreRoomSnapshot(
  roomId: string,
  snapId: string,
  opts?: {
    auth?: SnapshotAuth;
    /** Save current buffer as pre-restore checkpoint first. */
    checkpointCurrent?: boolean;
    currentText?: string;
  },
): Promise<{ text: string }> {
  const res = await fetch(
    `/api/rooms/${encodeURIComponent(roomId)}/snapshots/${encodeURIComponent(snapId)}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...snapshotHeaders(resolveSnapshotAuth(roomId, opts?.auth)),
      },
      body: JSON.stringify({
        checkpointCurrent: Boolean(opts?.checkpointCurrent),
        ...(typeof opts?.currentText === "string"
          ? { currentText: opts.currentText }
          : {}),
      }),
    },
  );
  const body = (await res.json().catch(() => null)) as {
    text?: string;
    error?: string;
  } | null;
  if (!res.ok) {
    throw new Error(body?.error || `Restore failed (${res.status})`);
  }
  if (typeof body?.text !== "string") {
    throw new Error("Restore response missing note text.");
  }
  return { text: body.text };
}

export async function patchRoomSnapshot(
  roomId: string,
  snapId: string,
  patch: { label?: string; pinned?: boolean },
  auth?: SnapshotAuth,
): Promise<RoomSnapshotMeta> {
  const res = await fetch(
    `/api/rooms/${encodeURIComponent(roomId)}/snapshots/${encodeURIComponent(snapId)}`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        ...snapshotHeaders(resolveSnapshotAuth(roomId, auth)),
      },
      body: JSON.stringify(patch),
    },
  );
  const body = (await res.json().catch(() => null)) as {
    snapshot?: RoomSnapshotMeta;
    error?: string;
  } | null;
  if (!res.ok || !body?.snapshot) {
    throw new Error(body?.error || `Failed to update snapshot (${res.status})`);
  }
  return body.snapshot;
}

export async function deleteRoomSnapshot(
  roomId: string,
  snapId: string,
  auth?: SnapshotAuth,
): Promise<void> {
  const res = await fetch(
    `/api/rooms/${encodeURIComponent(roomId)}/snapshots/${encodeURIComponent(snapId)}`,
    {
      method: "DELETE",
      headers: snapshotHeaders(resolveSnapshotAuth(roomId, auth)),
    },
  );
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || `Delete failed (${res.status})`);
  }
}

export function snapshotKindLabel(kind: SnapshotKind | undefined): string {
  switch (kind) {
    case "pre_ai":
      return "Pre-AI";
    case "pre_restore":
      return "Before restore";
    case "auto_idle":
      return "Auto";
    case "auto_interval":
      return "Auto";
    case "named":
      return "Milestone";
    default:
      return "Manual";
  }
}
