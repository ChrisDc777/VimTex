"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createRoomSnapshot,
  deleteRoomSnapshot,
  listRoomSnapshots,
  restoreRoomSnapshot,
  type RoomSnapshotMeta,
} from "@/lib/room-snapshots";
import { notify } from "@/lib/toasts";

type RoomSnapshotsDialogProps = {
  open: boolean;
  roomId: string;
  onClose: () => void;
};

export function RoomSnapshotsDialog({
  open,
  roomId,
  onClose,
}: RoomSnapshotsDialogProps) {
  const [snapshots, setSnapshots] = useState<RoomSnapshotMeta[]>([]);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoadError(null);
    try {
      setSnapshots(await listRoomSnapshots(roomId));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load");
    }
  }, [roomId]);

  useEffect(() => {
    if (!open) return;
    setLabel("");
    void refresh();
  }, [open, refresh]);

  if (!open) return null;

  const handleCreate = async () => {
    setBusy(true);
    try {
      await createRoomSnapshot(roomId, label);
      setLabel("");
      notify.success("Checkpoint saved");
      await refresh();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async (snap: RoomSnapshotMeta) => {
    if (
      !window.confirm(
        `Restore “${snap.label}”? This replaces the shared note text for everyone in the room.`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await restoreRoomSnapshot(roomId, snap.id);
      notify.success("Checkpoint restored");
      onClose();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (snap: RoomSnapshotMeta) => {
    if (!window.confirm(`Delete “${snap.label}”?`)) return;
    setBusy(true);
    try {
      await deleteRoomSnapshot(roomId, snap.id);
      notify.success("Checkpoint deleted");
      await refresh();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="flex max-h-[min(80vh,32rem)] w-full max-w-md flex-col rounded-lg border border-hairline bg-[color:var(--canvas)] p-4 shadow-xl"
        role="dialog"
        aria-labelledby="room-snapshots-title"
      >
        <div className="flex items-start justify-between gap-2">
          <h2 id="room-snapshots-title" className="text-sm font-semibold text-ink">
            Version history
          </h2>
          <button
            type="button"
            className="vt-chat-icon-btn"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <p className="mt-1 text-xs text-mute">
          Manual checkpoints of the shared note. Restore replaces the live buffer.
        </p>

        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (optional)"
            className="min-w-0 flex-1 rounded border border-hairline bg-transparent px-2 py-1.5 text-sm text-ink"
            disabled={busy}
          />
          <button
            type="button"
            className="vt-pill shrink-0"
            disabled={busy}
            onClick={() => void handleCreate()}
          >
            Save
          </button>
        </div>

        {loadError ? (
          <p className="mt-2 text-xs text-[color:var(--danger,#ee6352)]">{loadError}</p>
        ) : null}

        <ul className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
          {snapshots.length === 0 ? (
            <li className="text-xs text-mute">No checkpoints yet.</li>
          ) : (
            snapshots.map((snap) => (
              <li
                key={snap.id}
                className="rounded border border-hairline px-2 py-2 text-xs"
              >
                <p className="font-medium text-ink">{snap.label}</p>
                <p className="text-mute">
                  {new Date(snap.createdAt).toLocaleString()} · {snap.byteLength}{" "}
                  bytes
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="vt-pill vt-pill--ghost"
                    disabled={busy}
                    onClick={() => void handleRestore(snap)}
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    className="vt-pill vt-pill--ghost"
                    disabled={busy}
                    onClick={() => void handleDelete(snap)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
