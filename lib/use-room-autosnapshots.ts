"use client";

import { useEffect, useRef } from "react";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import {
  formatAutosnapLabel,
  shouldCreateAutosnap,
} from "@/lib/autosnap-policy";
import {
  autosnapEnabled,
  HISTORY_PREFS_EVENT,
  IDLE_AUTOSNAP_MS,
  loadHistoryPrefs,
} from "@/lib/history-prefs";
import {
  createRoomSnapshot,
  type SnapshotAuth,
  type SnapshotKind,
} from "@/lib/room-snapshots";

type UseRoomAutosnapshotsOptions = {
  roomId: string | null;
  readOnly: boolean;
  auth?: SnapshotAuth;
};

/**
 * Idle + interval autosnapshots for the open room (#126).
 * Coalesces overlapping triggers; server hash-dedupes within 5 minutes.
 */
export function useRoomAutosnapshots({
  roomId,
  readOnly,
  auth,
}: UseRoomAutosnapshotsOptions): void {
  const workspace = useWorkspace();
  const lastHashRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);
  const queuedKindRef = useRef<SnapshotKind | null>(null);

  useEffect(() => {
    if (!roomId || !workspace || readOnly || workspace.readOnly) return;

    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let intervalTimer: ReturnType<typeof setInterval> | null = null;
    let disposed = false;

    const snap = async (kind: "auto_idle" | "auto_interval") => {
      if (disposed) return;
      const prefs = loadHistoryPrefs();
      if (!autosnapEnabled(prefs)) return;
      const enabled =
        kind === "auto_idle" ? prefs.idleAutosnap : prefs.intervalAutosnap;
      const decision = shouldCreateAutosnap({
        enabled,
        readOnly: workspace.readOnly || readOnly,
        inFlight: inFlightRef.current,
        text: workspace.getText(),
        lastHash: lastHashRef.current,
      });
      if (!decision.ok) {
        if (decision.reason === "in_flight") queuedKindRef.current = kind;
        return;
      }
      inFlightRef.current = true;
      try {
        const text = workspace.getText();
        await createRoomSnapshot(roomId, formatAutosnapLabel(kind), text, {
          auth,
          kind,
        });
        lastHashRef.current = decision.hash;
      } catch {
        // Silent: autosnap must not toast over editing.
      } finally {
        inFlightRef.current = false;
        const queued = queuedKindRef.current;
        queuedKindRef.current = null;
        if (queued && !disposed) {
          void snap(queued === "auto_interval" ? "auto_interval" : "auto_idle");
        }
      }
    };

    const armIdle = () => {
      if (idleTimer) clearTimeout(idleTimer);
      const prefs = loadHistoryPrefs();
      if (!autosnapEnabled(prefs) || !prefs.idleAutosnap) return;
      idleTimer = setTimeout(() => {
        void snap("auto_idle");
      }, IDLE_AUTOSNAP_MS);
    };

    const onText = (event: { transaction?: { local?: boolean } }) => {
      if (!event.transaction?.local) return;
      armIdle();
    };

    workspace.ytext.observe(onText);

    const syncInterval = () => {
      if (intervalTimer) {
        clearInterval(intervalTimer);
        intervalTimer = null;
      }
      const prefs = loadHistoryPrefs();
      if (!autosnapEnabled(prefs) || !prefs.intervalAutosnap) return;
      const ms = prefs.intervalMinutes * 60_000;
      intervalTimer = setInterval(() => {
        void snap("auto_interval");
      }, ms);
    };

    syncInterval();

    const onPrefs = () => {
      armIdle();
      syncInterval();
    };
    window.addEventListener(HISTORY_PREFS_EVENT, onPrefs);

    return () => {
      disposed = true;
      workspace.ytext.unobserve(onText);
      window.removeEventListener(HISTORY_PREFS_EVENT, onPrefs);
      if (idleTimer) clearTimeout(idleTimer);
      if (intervalTimer) clearInterval(intervalTimer);
    };
  }, [roomId, workspace, readOnly, auth]);
}
