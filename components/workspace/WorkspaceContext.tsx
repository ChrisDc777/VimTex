"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  WorkspaceController,
  type WorkspaceCallbacks,
} from "@/lib/workspace-controller";
import type { CollabStatus, CollabUser, PeerInfo } from "@/lib/types";

const WorkspaceContext = createContext<WorkspaceController | null>(null);

export function WorkspaceProvider({
  value,
  children,
}: {
  value: WorkspaceController | null;
  children: ReactNode;
}) {
  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

/** Access the active room's workspace controller (null before it exists). */
export function useWorkspace(): WorkspaceController | null {
  return useContext(WorkspaceContext);
}

export type UseWorkspaceControllerOptions = {
  /** Create the workspace only once the room/user are ready. */
  enabled: boolean;
  roomId: string | null;
  user: CollabUser | null;
  collaborationEnabled?: boolean;
  /** View-only capability token from `?view=` (null/omit = edit). */
  viewToken?: string | null;
  localSeed?: string | null;
  emptyRoomSeed?: string | null;
  onTextChange: (text: string) => void;
  onCollabStatus: (status: CollabStatus) => void;
  onPeersChange: (peers: PeerInfo[]) => void;
};

/**
 * Owns the WorkspaceController lifecycle for the active room: created in an
 * effect (never during render, so SSR/hydration stay clean), destroyed when
 * the room changes, and kept in sync with the user / seed / callbacks.
 */
export function useWorkspaceController(
  options: UseWorkspaceControllerOptions,
): WorkspaceController | null {
  const {
    enabled,
    roomId,
    user,
    collaborationEnabled = true,
    viewToken = null,
    localSeed,
    emptyRoomSeed,
    onTextChange,
    onCollabStatus,
    onPeersChange,
  } = options;

  const [workspace, setWorkspace] = useState<WorkspaceController | null>(null);

  const callbacksRef = useRef<WorkspaceCallbacks>({
    onTextChange,
    onCollabStatus,
    onPeersChange,
  });
  callbacksRef.current = { onTextChange, onCollabStatus, onPeersChange };

  useEffect(() => {
    if (!enabled || !roomId || !user) {
      setWorkspace(null);
      return;
    }
    const ws = new WorkspaceController({
      roomId,
      user,
      collaborationEnabled,
      viewToken,
      localSeed,
      emptyRoomSeed,
    });
    setWorkspace(ws);
    return () => {
      ws.destroy();
      setWorkspace(null);
    };
    // Recreate only on room/collab/view-token changes — user/seed/callbacks sync below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, roomId, collaborationEnabled, viewToken]);

  useEffect(() => {
    if (!workspace || !user) return;
    workspace.setUser(user);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace, user?.name, user?.color, user?.colorLight]);

  useEffect(() => {
    if (!workspace) return;
    workspace.setLocalSeed(localSeed ?? null);
  }, [workspace, localSeed]);

  useEffect(() => {
    workspace?.setCallbacks(callbacksRef.current);
  });

  return workspace;
}
