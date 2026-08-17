"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchRoomMeta,
  loadRoomAuthToken,
  unlockRoom,
  type RoomMetaPublic,
} from "@/lib/room-meta";

export type RoomGateState = {
  /** Meta fetch finished (success or no room yet). */
  checked: boolean;
  meta: RoomMetaPublic | null;
  authToken: string | null;
  /** True when password required and we don't have a valid session token yet. */
  needsPassword: boolean;
  /**
   * True when guest ACL is on but URL has neither edit nor view capability.
   * Do not open the WS in this state (avoids reconnect loops).
   */
  needsShareLink: boolean;
  /** Meta fetch failed — do not treat as a blank new room. */
  unavailable: boolean;
  unavailableError: string | null;
  expired: boolean;
  unlockError: string | null;
  unlocking: boolean;
  unlock: (password: string) => Promise<void>;
  refreshMeta: () => Promise<void>;
  /** Call after settings save so gate state stays in sync. */
  applyMeta: (meta: RoomMetaPublic) => void;
};

type CapOpts = {
  editSecret?: string | null;
  viewToken?: string | null;
};

/**
 * Loads room meta and gates collab until password unlock / share-link capability.
 */
export function useRoomGate(
  roomId: string | null,
  enabled: boolean,
  caps: CapOpts = {},
): RoomGateState {
  const { editSecret = null, viewToken = null } = caps;
  const [checked, setChecked] = useState(false);
  const [meta, setMeta] = useState<RoomMetaPublic | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [unavailableError, setUnavailableError] = useState<string | null>(null);

  const refreshMeta = useCallback(async () => {
    if (!roomId || !enabled) {
      setMeta(null);
      setAuthToken(null);
      setChecked(!enabled || !roomId);
      return;
    }
    setChecked(false);
    setUnavailable(false);
    setUnavailableError(null);
    try {
      const next = await fetchRoomMeta(roomId);
      setMeta(next);
      if (next.expired) {
        setAuthToken(null);
      } else if (next.requiresPassword) {
        setAuthToken(loadRoomAuthToken(roomId));
      } else {
        setAuthToken(null);
      }
      setUnlockError(null);
    } catch (err) {
      setMeta(null);
      setAuthToken(null);
      setUnavailable(true);
      setUnavailableError(
        err instanceof Error ? err.message : "Room service unavailable",
      );
    } finally {
      setChecked(true);
    }
  }, [roomId, enabled]);

  useEffect(() => {
    void refreshMeta();
  }, [refreshMeta]);

  const unlock = useCallback(
    async (password: string) => {
      if (!roomId) return;
      setUnlocking(true);
      setUnlockError(null);
      try {
        const token = await unlockRoom(roomId, password);
        setAuthToken(token);
        setMeta((prev) =>
          prev
            ? { ...prev, requiresPassword: true, expired: false }
            : {
                roomId,
                requiresPassword: true,
                hasEditAcl: false,
                expiresAt: null,
                expired: false,
              },
        );
      } catch (err) {
        setUnlockError(err instanceof Error ? err.message : "Unlock failed");
      } finally {
        setUnlocking(false);
      }
    },
    [roomId],
  );

  const applyMeta = useCallback(
    (next: RoomMetaPublic) => {
      setMeta(next);
      if (next.requiresPassword && roomId) {
        setAuthToken(loadRoomAuthToken(roomId));
      } else {
        setAuthToken(null);
      }
    },
    [roomId],
  );

  const expired = Boolean(meta?.expired);
  const needsPassword = Boolean(
    checked && meta?.requiresPassword && !authToken && !expired,
  );
  const needsShareLink = Boolean(
    checked &&
      meta?.hasEditAcl &&
      !editSecret?.trim() &&
      !viewToken?.trim() &&
      !expired,
  );

  return {
    checked,
    meta,
    authToken,
    needsPassword,
    needsShareLink,
    expired,
    unavailable,
    unavailableError,
    unlockError,
    unlocking,
    unlock,
    refreshMeta,
    applyMeta,
  };
}
