"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearRecentRooms,
  loadRecentRooms,
  recordRecentRoom,
  type RecentRoom,
} from "@/lib/recent-rooms";

/** Track recent rooms whenever the active room changes. */
export function useRecentRoomsTracker(roomId: string | null): {
  recentRooms: RecentRoom[];
  clear: () => void;
  refresh: () => void;
} {
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);

  const refresh = useCallback(() => {
    setRecentRooms(loadRecentRooms());
  }, []);

  useEffect(() => {
    if (!roomId) return;
    recordRecentRoom(roomId);
    refresh();
  }, [roomId, refresh]);

  const clear = useCallback(() => {
    clearRecentRooms();
    setRecentRooms([]);
  }, []);

  return { recentRooms, clear, refresh };
}
