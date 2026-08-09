/** Client helpers for room snapshots (#25). */

export type RoomSnapshotMeta = {
  id: string;
  roomId: string;
  label: string;
  createdAt: number;
  byteLength: number;
};

export async function listRoomSnapshots(
  roomId: string,
): Promise<RoomSnapshotMeta[]> {
  const res = await fetch(
    `/api/rooms/${encodeURIComponent(roomId)}/snapshots`,
  );
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || `Failed to list snapshots (${res.status})`);
  }
  const data = (await res.json()) as { snapshots?: RoomSnapshotMeta[] };
  return data.snapshots ?? [];
}

export async function createRoomSnapshot(
  roomId: string,
  label?: string,
  /** Exact note text to checkpoint (preferred). Falls back to server Y.Doc. */
  text?: string,
): Promise<RoomSnapshotMeta> {
  const res = await fetch(
    `/api/rooms/${encodeURIComponent(roomId)}/snapshots`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        label: label ?? "",
        ...(typeof text === "string" ? { text } : {}),
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

export async function restoreRoomSnapshot(
  roomId: string,
  snapId: string,
): Promise<void> {
  const res = await fetch(
    `/api/rooms/${encodeURIComponent(roomId)}/snapshots/${encodeURIComponent(snapId)}`,
    { method: "POST" },
  );
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || `Restore failed (${res.status})`);
  }
}

export async function deleteRoomSnapshot(
  roomId: string,
  snapId: string,
): Promise<void> {
  const res = await fetch(
    `/api/rooms/${encodeURIComponent(roomId)}/snapshots/${encodeURIComponent(snapId)}`,
    { method: "DELETE" },
  );
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || `Delete failed (${res.status})`);
  }
}
