"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import toast from "react-hot-toast";
import { formatAiAcceptSnapshotLabel } from "@/lib/ai-accept-snapshot";
import {
  loadAiReviewPrefs,
  saveAiApplyMode,
  saveAiShowInPreview,
  saveAiSnapshotOnAccept,
  type AiApplyMode,
  type AiReviewPrefs,
} from "@/lib/ai-review-prefs";
import {
  AiReviewStore,
  type AiEditOutcome,
  type PendingAiEdit,
} from "@/lib/ai-review-store";
import { createRoomSnapshot } from "@/lib/room-snapshots";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";

type AiReviewContextValue = {
  store: AiReviewStore;
  prefs: AiReviewPrefs;
  setApplyMode: (mode: AiApplyMode) => void;
  setShowInPreview: (enabled: boolean) => void;
  setSnapshotOnAccept: (enabled: boolean) => void;
  pending: PendingAiEdit | null;
  outcomes: Record<string, AiEditOutcome>;
  lastAuto: PendingAiEdit | null;
  /** Propose an edit: confirm → pending; auto → apply + Undo toast. */
  proposeDocumentEdit: (edit: PendingAiEdit) => void;
  acceptPending: () => Promise<{ stale: boolean } | null>;
  rejectPending: () => void;
  undoLastAuto: () => void;
};

const AiReviewContext = createContext<AiReviewContextValue | null>(null);

export function AiReviewProvider({ children }: { children: ReactNode }) {
  const workspace = useWorkspace();
  const storeRef = useRef<AiReviewStore | null>(null);
  if (storeRef.current == null) storeRef.current = new AiReviewStore();
  const store = storeRef.current;

  const [prefs, setPrefs] = useState<AiReviewPrefs>(() => loadAiReviewPrefs());

  useEffect(() => {
    store.reset();
  }, [workspace, store]);

  const snapshot = useSyncExternalStore(
    (onStoreChange) => store.subscribe(onStoreChange),
    () => store.getSnapshot(),
    () => store.getSnapshot(),
  );

  const setApplyMode = useCallback((mode: AiApplyMode) => {
    saveAiApplyMode(mode);
    setPrefs((prev) => ({ ...prev, applyMode: mode }));
  }, []);

  const setShowInPreview = useCallback((enabled: boolean) => {
    saveAiShowInPreview(enabled);
    setPrefs((prev) => ({ ...prev, showInPreview: enabled }));
  }, []);

  const setSnapshotOnAccept = useCallback((enabled: boolean) => {
    saveAiSnapshotOnAccept(enabled);
    setPrefs((prev) => ({ ...prev, snapshotOnAccept: enabled }));
  }, []);

  const undoLastAuto = useCallback(() => {
    const ws = workspace;
    const edit = store.takeLastAuto();
    if (!ws || !edit || ws.readOnly) return;
    ws.applyAiEdit(edit.before);
    toast.success("AI edit undone");
  }, [workspace, store]);

  const proposeDocumentEdit = useCallback(
    (edit: PendingAiEdit) => {
      const ws = workspace;
      if (!ws || ws.readOnly) return;

      if (prefs.applyMode === "auto") {
        // Auto-apply skips room snapshot (#89) — Undo toast is the recovery path.
        ws.applyAiEdit(edit.after);
        store.commitAuto(edit);
        toast(
          (t) => (
            <span className="flex items-center gap-2 text-sm">
              AI edit applied
              <button
                type="button"
                className="vt-btn vt-btn--ghost text-xs"
                onClick={() => {
                  toast.dismiss(t.id);
                  undoLastAuto();
                }}
              >
                Undo
              </button>
            </span>
          ),
          { duration: 12_000, id: "ai-auto-apply" },
        );
        return;
      }

      store.setPending(edit);
    },
    [workspace, prefs.applyMode, store, undoLastAuto],
  );

  const acceptPending = useCallback(async () => {
    const ws = workspace;
    const pending = store.getPending();
    if (!ws || !pending || ws.readOnly) return null;

    const stale = ws.getText() !== pending.before;
    if (stale) {
      toast(
        "Note changed since the proposal — applying may overwrite peer edits.",
        { icon: "⚠️", duration: 5_000 },
      );
    }

    // Optional checkpoint of the live buffer before apply (room-wide restore).
    if (prefs.snapshotOnAccept) {
      try {
        await createRoomSnapshot(
          ws.roomId,
          formatAiAcceptSnapshotLabel(pending.source, pending.createdAt),
        );
        toast.success("Checkpoint saved before AI apply", { duration: 3_000 });
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Checkpoint failed — applying edit anyway",
          { duration: 5_000 },
        );
      }
    }

    ws.applyAiEdit(pending.after);
    store.commitAccepted(pending.messageId);
    return { stale };
  }, [workspace, store, prefs.snapshotOnAccept]);

  const rejectPending = useCallback(() => {
    const pending = store.getPending();
    if (!pending) return;
    store.commitRejected(pending.messageId);
  }, [store]);

  const value = useMemo<AiReviewContextValue>(
    () => ({
      store,
      prefs,
      setApplyMode,
      setShowInPreview,
      setSnapshotOnAccept,
      pending: snapshot.pending,
      outcomes: snapshot.outcomes,
      lastAuto: snapshot.lastAuto,
      proposeDocumentEdit,
      acceptPending,
      rejectPending,
      undoLastAuto,
    }),
    [
      store,
      prefs,
      setApplyMode,
      setShowInPreview,
      setSnapshotOnAccept,
      snapshot.pending,
      snapshot.outcomes,
      snapshot.lastAuto,
      proposeDocumentEdit,
      acceptPending,
      rejectPending,
      undoLastAuto,
    ],
  );

  return (
    <AiReviewContext.Provider value={value}>{children}</AiReviewContext.Provider>
  );
}

export function useAiReview(): AiReviewContextValue {
  const ctx = useContext(AiReviewContext);
  if (!ctx) {
    throw new Error("useAiReview must be used within AiReviewProvider");
  }
  return ctx;
}

/** Optional hook when provider may be absent (should not happen in shells). */
export function useAiReviewOptional(): AiReviewContextValue | null {
  return useContext(AiReviewContext);
}
