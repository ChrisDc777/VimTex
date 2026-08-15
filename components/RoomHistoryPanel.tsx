"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { CloseIcon } from "@/components/chat/icons";
import { SidePanelHeader } from "@/components/SidePanelHeader";
import {
  diffLines,
  summarizeDiff,
  type DiffLine,
} from "@/lib/text-diff";
import {
  HISTORY_PREFS_EVENT,
  loadHistoryPrefs,
  setCheckpointMode,
  type CheckpointMode,
  type HistoryPrefs,
} from "@/lib/history-prefs";
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
  type SnapshotKind,
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
};

type PreviewTab = "changes" | "source";

type DayGroup = {
  key: string;
  label: string;
  items: RoomSnapshotMeta[];
};

function dayKeyFromDate(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayKey(createdAt: number): string {
  return dayKeyFromDate(new Date(createdAt));
}

function dayLabel(createdAt: number, now: number): string {
  const d = new Date(createdAt);
  const today = new Date(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const key = dayKeyFromDate(d);
  if (key === dayKeyFromDate(today)) return "Today";
  if (key === dayKeyFromDate(yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function groupByDay(snaps: RoomSnapshotMeta[], now: number): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const snap of snaps) {
    const key = dayKey(snap.createdAt);
    let group = map.get(key);
    if (!group) {
      group = { key, label: dayLabel(snap.createdAt, now), items: [] };
      map.set(key, group);
    }
    group.items.push(snap);
  }
  return [...map.values()];
}

function isNamedVersion(snap: RoomSnapshotMeta): boolean {
  if (snap.pinned) return true;
  if (snap.kind === "named" || snap.kind === "manual") return true;
  // Labeled non-auto snaps count as milestones.
  if (
    snap.label &&
    snap.kind !== "auto_idle" &&
    snap.kind !== "auto_interval" &&
    snap.kind !== "pre_ai" &&
    snap.kind !== "pre_restore"
  ) {
    return true;
  }
  return false;
}

function displayTitle(snap: RoomSnapshotMeta): string {
  if (snap.kind === "named" || snap.kind === "manual") return snap.label;
  if (snap.pinned && snap.label) return snap.label;
  return snapshotKindLabel(snap.kind);
}

function quietMeta(snap: RoomSnapshotMeta, now: number): string {
  const time = formatRelativeTime(snap.createdAt, now);
  if (snap.kind === "auto_idle" || snap.kind === "auto_interval") {
    return `Auto · ${time}`;
  }
  return time;
}

function kindChip(kind: SnapshotKind | undefined): string | null {
  if (kind === "pre_ai" || kind === "pre_restore") {
    return snapshotKindLabel(kind);
  }
  return null;
}

export function RoomHistoryPanel({
  roomId,
  onClose,
  readOnly = false,
  auth,
}: RoomHistoryPanelProps) {
  const workspace = useWorkspace();
  const [snapshots, setSnapshots] = useState<RoomSnapshotMeta[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<PreviewTab>("changes");
  const [namedOnly, setNamedOnly] = useState(false);
  const [label, setLabel] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [historyPrefs, setHistoryPrefs] = useState<HistoryPrefs>(() =>
    loadHistoryPrefs(),
  );

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const sync = () => setHistoryPrefs(loadHistoryPrefs());
    sync();
    window.addEventListener(HISTORY_PREFS_EVENT, sync);
    return () => window.removeEventListener(HISTORY_PREFS_EVENT, sync);
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
    let list = snapshots;
    if (namedOnly) list = list.filter(isNamedVersion);
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        snapshotKindLabel(s.kind).toLowerCase().includes(q) ||
        (s.createdBy?.name ?? "").toLowerCase().includes(q),
    );
  }, [snapshots, query, namedOnly]);

  const groups = useMemo(() => groupByDay(filtered, now), [filtered, now]);

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
  const diffRows = useMemo((): DiffLine[] | null => {
    if (previewText == null) return null;
    return diffLines(previewText, liveText);
  }, [previewText, liveText]);

  const diffSummary = useMemo(() => {
    if (!diffRows) return null;
    return summarizeDiff(diffRows);
  }, [diffRows]);

  const onModeChange = (mode: CheckpointMode) => {
    setHistoryPrefs(setCheckpointMode(mode));
  };

  const handleCreate = async () => {
    setBusy(true);
    try {
      const text =
        workspace && !workspace.readOnly ? workspace.getText() : undefined;
      const trimmed = label.trim();
      await createRoomSnapshot(roomId, trimmed, text, {
        auth,
        kind: trimmed ? "named" : "manual",
      });
      setLabel("");
      notify.success(trimmed ? "Named version saved" : "Version saved");
      await refresh();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async (snap: RoomSnapshotMeta) => {
    const ok = await notify.confirm({
      id: "vt-history-restore",
      message: `Restore “${snap.label}” for the whole room? A “before restore” checkpoint is saved first.`,
      confirmLabel: "Restore",
      cancelLabel: "Cancel",
    });
    if (!ok) return;
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
      notify.success("Version restored for the room");
      await refresh();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (snap: RoomSnapshotMeta) => {
    const ok = await notify.confirm({
      id: "vt-history-delete",
      message: `Delete “${snap.label}”? This cannot be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await deleteRoomSnapshot(roomId, snap.id, auth);
      notify.success("Version deleted");
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
      notify.success("Version renamed");
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
      notify.success(
        snap.pinned ? "Unpinned" : "Pinned — kept when history fills up",
      );
      await refresh();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Pin failed");
    } finally {
      setBusy(false);
    }
  };

  const handleFork = async (snap: RoomSnapshotMeta) => {
    const ok = await notify.confirm({
      id: "vt-history-fork",
      message: `Fork “${snap.label}” into a new room? You’ll leave this room and open the fork with edit access.`,
      confirmLabel: "Fork",
      cancelLabel: "Cancel",
    });
    if (!ok) return;
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

  const emptyMessage =
    namedOnly || historyPrefs.checkpointMode === "manual"
      ? "No named versions yet."
      : "No versions yet — keep editing and Automatic will checkpoint after idle.";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SidePanelHeader
        title="History"
        meta={<span>{snapshots.length} versions</span>}
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

      <div className="vt-history-panel flex min-h-0 flex-1 flex-col">
        {!readOnly ? (
          <div className="vt-history-panel__mode" role="group" aria-label="Checkpoint mode">
            <button
              type="button"
              className={
                historyPrefs.checkpointMode === "automatic"
                  ? "vt-history-panel__mode-btn vt-history-panel__mode-btn--active"
                  : "vt-history-panel__mode-btn"
              }
              aria-pressed={historyPrefs.checkpointMode === "automatic"}
              onClick={() => onModeChange("automatic")}
            >
              Automatic
            </button>
            <button
              type="button"
              className={
                historyPrefs.checkpointMode === "manual"
                  ? "vt-history-panel__mode-btn vt-history-panel__mode-btn--active"
                  : "vt-history-panel__mode-btn"
              }
              aria-pressed={historyPrefs.checkpointMode === "manual"}
              onClick={() => onModeChange("manual")}
            >
              Manual
            </button>
          </div>
        ) : null}

        {historyPrefs.checkpointMode === "manual" && !readOnly ? (
          <p className="vt-history-panel__hint">
            Live editing still syncs. Versions are only saved when you name them.
          </p>
        ) : null}

        {!readOnly ? (
          <div className="vt-history-panel__create">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Name this version…"
              className="vt-history-panel__label-input"
              disabled={busy}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreate();
              }}
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
            Read-only — browse and compare versions.
          </p>
        )}

        <div className="vt-history-panel__filters">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search versions…"
            className="vt-history-panel__search-input"
            aria-label="Search versions"
          />
          <label className="vt-history-panel__named-only">
            <input
              type="checkbox"
              checked={namedOnly}
              onChange={(e) => setNamedOnly(e.target.checked)}
            />
            Named only
          </label>
        </div>

        {loadError ? (
          <p className="vt-history-panel__error">{loadError}</p>
        ) : null}

        <div className="vt-history-panel__body">
          <div className="vt-history-timeline" role="listbox" aria-label="Versions">
            {filtered.length === 0 ? (
              <p className="vt-history-timeline__empty">{emptyMessage}</p>
            ) : (
              groups.map((group) => (
                <div key={group.key} className="vt-history-timeline__group">
                  <div className="vt-history-timeline__day">{group.label}</div>
                  <ul className="vt-history-timeline__list">
                    {group.items.map((snap) => {
                      const active = snap.id === selectedId;
                      const chip = kindChip(snap.kind);
                      const named = isNamedVersion(snap);
                      return (
                        <li key={snap.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={active}
                            className={
                              active
                                ? "vt-history-timeline__item vt-history-timeline__item--active"
                                : named
                                  ? "vt-history-timeline__item vt-history-timeline__item--named"
                                  : "vt-history-timeline__item"
                            }
                            onClick={() => setSelectedId(snap.id)}
                          >
                            <span className="vt-history-timeline__label">
                              {snap.pinned ? (
                                <span
                                  className="vt-history-timeline__pin"
                                  aria-label="Pinned"
                                >
                                  ★
                                </span>
                              ) : null}
                              {displayTitle(snap)}
                            </span>
                            <span className="vt-history-timeline__meta">
                              <span className="vt-history-timeline__time">
                                {quietMeta(snap, now)}
                              </span>
                              {snap.createdBy?.name ? (
                                <span className="vt-history-timeline__author">
                                  {snap.createdBy.name}
                                </span>
                              ) : null}
                            </span>
                            {chip ? (
                              <span className="vt-history-timeline__chip">
                                {chip}
                              </span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </div>

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
                      aria-label="Version name"
                      autoFocus
                      disabled={busy}
                    />
                  ) : (
                    <p className="vt-history-preview__title">
                      {selected.label}
                    </p>
                  )}
                  <div
                    className="vt-history-preview__tabs"
                    role="tablist"
                    aria-label="Preview"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={previewTab === "changes"}
                      className={
                        previewTab === "changes"
                          ? "vt-history-preview__tab vt-history-preview__tab--active"
                          : "vt-history-preview__tab"
                      }
                      onClick={() => setPreviewTab("changes")}
                    >
                      Changes
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={previewTab === "source"}
                      className={
                        previewTab === "source"
                          ? "vt-history-preview__tab vt-history-preview__tab--active"
                          : "vt-history-preview__tab"
                      }
                      onClick={() => setPreviewTab("source")}
                    >
                      Source
                    </button>
                  </div>
                </div>
                {previewTab === "changes" && diffSummary ? (
                  <p className="vt-history-preview__diff-summary">
                    {diffSummary.added === 0 && diffSummary.removed === 0
                      ? "Identical to live note"
                      : `+${diffSummary.added} / −${diffSummary.removed} lines vs live`}
                  </p>
                ) : null}
                {previewTab === "changes" ? (
                  <div className="vt-history-preview__diff" aria-label="Diff vs live">
                    {previewText == null ? (
                      <p className="vt-history-preview__loading">
                        Loading preview…
                      </p>
                    ) : diffRows &&
                      diffSummary &&
                      diffSummary.added === 0 &&
                      diffSummary.removed === 0 ? (
                      <pre className="vt-history-preview__text">
                        {previewText || "(empty)"}
                      </pre>
                    ) : (
                      (diffRows ?? []).map((row, i) => (
                        <div
                          key={`${row.kind}-${i}`}
                          className={`vt-history-diff__line vt-history-diff__line--${row.kind}`}
                        >
                          <span className="vt-history-diff__mark" aria-hidden>
                            {row.kind === "add"
                              ? "+"
                              : row.kind === "del"
                                ? "−"
                                : " "}
                          </span>
                          <span className="vt-history-diff__body">
                            {row.text || " "}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <pre className="vt-history-preview__text">
                    {previewText ?? "Loading preview…"}
                  </pre>
                )}
                {!readOnly ? (
                  <div className="vt-history-preview__actions">
                    <button
                      type="button"
                      className="vt-pill"
                      disabled={busy || workspace?.readOnly}
                      title="Replaces the shared note for everyone in the room"
                      onClick={() => void handleRestore(selected)}
                    >
                      Restore for room
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
                Select a version to preview changes vs the live note.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
