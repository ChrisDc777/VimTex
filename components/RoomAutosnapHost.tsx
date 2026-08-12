"use client";

import { useRoomAutosnapshots } from "@/lib/use-room-autosnapshots";
import type { SnapshotAuth } from "@/lib/room-snapshots";

/** Mount inside WorkspaceProvider so idle/interval autosnaps can read the live note. */
export function RoomAutosnapHost({
  roomId,
  readOnly,
  auth,
}: {
  roomId: string | null;
  readOnly: boolean;
  auth?: SnapshotAuth;
}) {
  useRoomAutosnapshots({ roomId, readOnly, auth });
  return null;
}
