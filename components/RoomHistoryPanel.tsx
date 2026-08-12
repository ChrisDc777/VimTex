"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { CloseIcon } from "@/components/chat/icons";
import { SidePanelHeader } from "@/components/SidePanelHeader";
import { diffLines, summarizeDiff } from "@/lib/text-diff";
import {
  createRoomSnapshot,
  deleteRoomSnapshot,
  fetchSnapshotPreview,
  forkRoomSnapshot,
  listRoomSnapshots,
  patchRoomSnapshot,
  restoreRoomSnapshot,
  snapshotKindLabel,
  type RoomSnapshotMeta,
  type SnapshotAuth,
} from "@/lib/room-snapshots";
import { writeRoomToLocation } from "@/lib/collab";
import { saveEditSecret } from "@/lib/room-auth";
import { formatRelativeTime } from "@/lib/room-chat";
import { notify } from "@/lib/toasts";

export type RoomHistoryPanelProps = {
  roomId: string;
  onClose: () => void;
  readOnly?: boolean;
  auth?: SnapshotAuth;
  /** Parent supplies `RightPanelSwitcher` chrome. */
  chromeless?: boolean;
};

export function RoomHistoryPanel({
  roomId,
  onClose,
  readOnly = false,
  auth,
  chromeless = false,
}: RoomHistoryPanelProps) {
  const workspace = useWorkspace();
  const [snapshots, setSnapshots] = useState<RoomSnapshotMeta[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [label, setLabel] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const refresh = useCallback(async () => {
    setLoadError(null);
    try {
      const list = await listRoomSnapshots(roomId, auth);
      setSnapshots(list);
      if (list.length === 0) {
        setSelectedId(null);
        setPreviewText(null);
      } else if (!list.some((s) => s.id === selectedId)) {
        setSelectedId(list[0]!.id);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load");
    }
  }, [roomId, auth, selectedId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return snapshots;
    return snapshots.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        snapshotKindLabel(s.kind).toLowerCase().includes(q),
    );
  }, [snapshots, query]);

  const selected = snapshots.find((s) => s.id === selectedId) ?? null;

  useEffect(() => {
    setRenaming(false);
    setRenameValue(selected?.label ?? "");
  }, [selected?.id, selected?.label]);

  useEffect(() => {
    if (!selectedId) {
      setPreviewText(null);
      return;
    }
    let cancelled = false;
    void fetchSnapshotPreview(roomId, selectedId, auth)
      .then(({ text }) => {
        if (!cancelled) setPreviewText(text);
      })
      .catch((err) => {
        if (!cancelled) {
          setPreviewText(null);
          notify.error(
            err instanceof Error ? err.message : "Failed to load preview",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [roomId, selectedId, auth]);

  const liveText = workspace?.getText() ?? "";
  const diffSummary = useMemo(() => {
    if (!compareMode || previewText == null) return null;
    return summarizeDiff(diffLines(previewText, liveText));
  }, [compareMode, previewText, liveText]);

  const handleCreate = async () => {
    setBusy(true);
    try {
      const text =
        workspace && !workspace.readOnly ? workspace.getText() : undefined;
      await createRoomSnapshot(roomId, label, text, {
        auth,
        kind: label.trim() ? "named" : "manual",
      });
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
    if (!workspace || workspace.readOnly || readOnly) {
      notify.error("Cannot restore in a read-only session.");
      return;
    }
    setBusy(true);
    try {
      const currentText = workspace.getText();
      const { text } = await restoreRoomSnapshot(roomId, snap.id, {
        auth,
        checkpointCurrent: true,
        currentText,
      });
      workspace.restoreSnapshotText(text);
      notify.success("Checkpoint restored");
      await refresh();
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
      await deleteRoomSnapshot(roomId, snap.id, auth);
      notify.success("Checkpoint deleted");
      await refresh();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const handleRename = async (snap: RoomSnapshotMeta) => {
    const next = renameValue.trim().slice(0, 80);
    if (!next || next === snap.label) {
      setRenaming(false);
      setRenameValue(snap.label);
      return;
    }
    setBusy(true);
    try {
      await patchRoomSnapshot(roomId, snap.id, { label: next }, auth);
      setRenaming(false);
      notify.success("Checkpoint renamed");
      await refresh();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Rename failed");
    } finally {
      setBusy(false);
    }
  };

  const handleTogglePin = async (snap: RoomSnapshotMeta) => {
    setBusy(true);
    try {
      await patchRoomSnapshot(
        roomId,
        snap.id,
        { pinned: !snap.pinned },
        auth,
      );
      notify.success(snap.pinned ? "Unpinned" : "Pinned — kept when history fills up");
      await refresh();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Pin failed");
    } finally {
      setBusy(false);
    }
  };

  const handleFork = async (snap: RoomSnapshotMeta) => {
    if (
      !window.confirm(
        `Fork “${snap.label}” into a new room? You’ll leave this room and open the fork with edit access.`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const forked = await forkRoomSnapshot(roomId, snap.id, {
        auth,
        createdBy: workspace
          ? { clientId: workspace.getClientId() }
          : undefined,
      });
      saveEditSecret(forked.roomId, forked.edit);
      writeRoomToLocation(forked.roomId, {
        editSecret: forked.edit,
        clearViewToken: true,
      });
      notify.success("Opened forked room");
      window.location.assign(
        `/?room=${encodeURIComponent(forked.roomId)}&edit=${encodeURIComponent(forked.edit)}`,
      );
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Fork failed");
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {chromeless ? null : (
        <SidePanelHeader
          title="History"
          meta={<span>{snapshots.length} checkpoints</span>}
          actions={
            <button
              type="button"
              onClick={onClose}
              className="vt-panel-header__icon-btn"
              aria-label="Close history"
            >
              <CloseIcon />
            </button>
          }
        />
      )}

      <div className="vt-history-panel flex min-h-0 flex-1 flex-col">
        {!readOnly ? (
          <div className="vt-history-panel__create">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label (optional)"
              className="vt-history-panel__label-input"
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
        ) : (
          <p className="vt-history-panel__ro-hint">
            Read-only — browse and compare checkpoints.
          </p>
        )}

        <div className="vt-history-panel__search">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search checkpoints…"
            className="vt-history-panel__search-input"
            aria-label="Search checkpoints"
          />
        </div>

        {loadError ? (
          <p className="vt-history-panel__error">{loadError}</p>
        ) : null}

        <div className="vt-history-panel__body">
          <ul className="vt-history-timeline" role="listbox" aria-label="Checkpoints">
            {filtered.length === 0 ? (
              <li className="vt-history-timeline__empty">No checkpoints yet.</li>
            ) : (
              filtered.map((snap) => {
                const active = snap.id === selectedId;
                return (
                  <li key={snap.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={
                        active
                          ? "vt-history-timeline__item vt-history-timeline__item--active"
                          : "vt-history-timeline__item"
                      }
                      onClick={() => setSelectedId(snap.id)}
                    >
                      <span className="vt-history-timeline__label">
                        {snap.pinned ? (
                          <span className="vt-history-timeline__pin" aria-label="Pinned">
                            ★
                          </span>
                        ) : null}
                        {snap.label}
                      </span>
                      <span className="vt-history-timeline__meta">
                        <span className="vt-history-timeline__kind">
                          {snapshotKindLabel(snap.kind)}
                        </span>
                        <span className="vt-history-timeline__time">
                          {formatRelativeTime(snap.createdAt, now)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          <div className="vt-history-preview">
            {selected ? (
              <>
                <div className="vt-history-preview__toolbar">
                  {renaming && !readOnly ? (
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleRename(selected);
                        if (e.key === "Escape") {
                          setRenaming(false);
                          setRenameValue(selected.label);
                        }
                      }}
                      className="vt-history-preview__rename"
                      aria-label="Checkpoint name"
                      autoFocus
                      disabled={busy}
                    />
                  ) : (
                    <p className="vt-history-preview__title">{selected.label}</p>
                  )}
                  <label className="vt-history-preview__compare">
                    <input
                      type="checkbox"
                      checked={compareMode}
                      onChange={(e) => setCompareMode(e.target.checked)}
                    />
                    Compare to live
                  </label>
                </div>
                {compareMode && diffSummary ? (
                  <p className="vt-history-preview__diff-summary">
                    +{diffSummary.added} / −{diffSummary.removed} lines vs live
                  </p>
                ) : null}
                <pre className="vt-history-preview__text">
                  {previewText ?? "Loading preview…"}
                </pre>
                {!readOnly ? (
                  <div className="vt-history-preview__actions">
                    <button
                      type="button"
                      className="vt-pill"
                      disabled={busy || workspace?.readOnly}
                      onClick={() => void handleRestore(selected)}
                    >
                      Restore
                    </button>
                    {renaming ? (
                      <button
                        type="button"
                        className="vt-pill vt-pill--ghost"
                        disabled={busy}
                        onClick={() => void handleRename(selected)}
                      >
                        Save name
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="vt-pill vt-pill--ghost"
                        disabled={busy}
                        onClick={() => {
                          setRenameValue(selected.label);
                          setRenaming(true);
                        }}
                      >
                        Rename
                      </button>
                    )}
                    <button
                      type="button"
                      className="vt-pill vt-pill--ghost"
                      disabled={busy}
                      aria-pressed={Boolean(selected.pinned)}
                      onClick={() => void handleTogglePin(selected)}
                    >
                      {selected.pinned ? "Unpin" : "Pin"}
                    </button>
                    <button
                      type="button"
                      className="vt-pill vt-pill--ghost"
                      disabled={busy}
                      onClick={() => void handleFork(selected)}
                    >
                      Fork
                    </button>
                    <button
                      type="button"
                      className="vt-pill vt-pill--ghost"
                      disabled={busy}
                      onClick={() => void handleDelete(selected)}
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="vt-history-preview__empty">
                Select a checkpoint to preview.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
