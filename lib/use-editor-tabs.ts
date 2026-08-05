"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createRoomId, writeRoomToLocation } from "@/lib/collab";
import { loadEditSecret } from "@/lib/room-auth";
import { deriveDocumentTitle } from "@/lib/document-title";
import { loadNote } from "@/lib/storage";
import {
  createInitialTabSession,
  loadTabSession,
  MAX_TABS,
  mergeUrlRoomIntoSession,
  saveTabSession,
  type EditorTab,
  type TabSession,
} from "@/lib/tab-storage";

type UseEditorTabsOptions = {
  urlRoomId: string | null;
  hydrated: boolean;
  onBeforeSwitch?: (fromRoomId: string, note: string) => void;
  onAfterSwitch?: (toRoomId: string, localSeed: string | null) => void;
  /** Fired when this hook allocates a brand-new room id (not when opening one). */
  onRoomCreated?: (roomId: string) => void;
};

type UseEditorTabsResult = {
  tabs: EditorTab[];
  activeRoomId: string | null;
  derivedTitles: Record<string, string>;
  canNewTab: boolean;
  selectTab: (roomId: string, currentNote: string) => void;
  closeTab: (roomId: string, currentNote: string) => void;
  newTab: (currentNote: string) => boolean;
  openRoom: (roomId: string, currentNote: string) => boolean;
  renameTab: (roomId: string, title: string) => void;
  updateDerivedTitle: (roomId: string, note: string) => void;
};

function getTabTitleSeed(roomId: string): string {
  return loadNote(roomId) ?? "";
}

function buildDerivedTitles(tabs: EditorTab[]): Record<string, string> {
  const titles: Record<string, string> = {};
  for (const tab of tabs) {
    titles[tab.roomId] = deriveDocumentTitle(getTabTitleSeed(tab.roomId));
  }
  return titles;
}

function saveSession(session: TabSession): void {
  saveTabSession(session);
}

export function useEditorTabs({
  urlRoomId,
  hydrated,
  onBeforeSwitch,
  onAfterSwitch,
  onRoomCreated,
}: UseEditorTabsOptions): UseEditorTabsResult {
  const [session, setSession] = useState<TabSession | null>(null);
  const [derivedTitles, setDerivedTitles] = useState<Record<string, string>>(
    {},
  );
  const deriveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onBeforeSwitchRef = useRef(onBeforeSwitch);
  const onAfterSwitchRef = useRef(onAfterSwitch);
  const onRoomCreatedRef = useRef(onRoomCreated);

  useEffect(() => {
    onBeforeSwitchRef.current = onBeforeSwitch;
    onAfterSwitchRef.current = onAfterSwitch;
    onRoomCreatedRef.current = onRoomCreated;
  }, [onBeforeSwitch, onAfterSwitch, onRoomCreated]);

  useEffect(() => {
    if (!hydrated) return;

    let next: TabSession;

    if (!urlRoomId) {
      // Bare `/` — always create a new room (mint via onRoomCreated).
      // Restoring vimtex:tabs here reopens ACL rooms without ?edit= and
      // looks "broken" vs incognito (empty storage).
      next = createInitialTabSession(null);
      onRoomCreatedRef.current?.(next.activeRoomId);
    } else {
      const stored = loadTabSession();
      next = stored ?? createInitialTabSession(urlRoomId);
      next = mergeUrlRoomIntoSession(next, urlRoomId);
    }

    setSession(next);
    setDerivedTitles(buildDerivedTitles(next.tabs));
    saveSession(next);
    onAfterSwitchRef.current?.(
      next.activeRoomId,
      loadNote(next.activeRoomId),
    );
  }, [hydrated, urlRoomId]);

  useEffect(() => {
    if (!session?.activeRoomId) return;
    const edit = loadEditSecret(session.activeRoomId);
    writeRoomToLocation(session.activeRoomId, {
      ...(edit ? { editSecret: edit } : { clearEditSecret: true }),
    });
  }, [session?.activeRoomId]);

  const applySession = useCallback(
  (
    updater: (prev: TabSession) => TabSession,
    switchOpts?: { fromRoomId?: string; currentNote?: string },
  ) => {
    setSession((prev) => {
      if (!prev) return prev;

      if (switchOpts?.fromRoomId && switchOpts.currentNote != null) {
        onBeforeSwitchRef.current?.(
          switchOpts.fromRoomId,
          switchOpts.currentNote,
        );
      }

      const next = updater(prev);
      saveSession(next);

      const activeChanged = next.activeRoomId !== prev.activeRoomId;
      if (activeChanged) {
        onAfterSwitchRef.current?.(
          next.activeRoomId,
          loadNote(next.activeRoomId),
        );
      }

      return next;
    });
  },
  [],
);

  const selectTab = useCallback(
    (roomId: string, currentNote: string) => {
      applySession(
        (prev) => {
          if (prev.activeRoomId === roomId) return prev;
          return { ...prev, activeRoomId: roomId };
        },
        { fromRoomId: session?.activeRoomId, currentNote },
      );
    },
    [applySession, session?.activeRoomId],
  );

  const closeTab = useCallback(
    (roomId: string, currentNote: string) => {
      const wasActive = session?.activeRoomId === roomId;
      applySession(
        (prev) => {
          if (prev.tabs.length === 1) {
            const freshRoom = createRoomId();
            onRoomCreatedRef.current?.(freshRoom);
            return {
              tabs: [{ roomId: freshRoom }],
              activeRoomId: freshRoom,
            };
          }

          const index = prev.tabs.findIndex((tab) => tab.roomId === roomId);
          if (index < 0) return prev;

          const tabs = prev.tabs.filter((tab) => tab.roomId !== roomId);
          let activeRoomId = prev.activeRoomId;

          if (prev.activeRoomId === roomId) {
            const neighbor = tabs[index] ?? tabs[index - 1] ?? tabs[0]!;
            activeRoomId = neighbor.roomId;
          }

          return { tabs, activeRoomId };
        },
        wasActive ? { fromRoomId: roomId, currentNote } : undefined,
      );
    },
    [applySession, session?.activeRoomId],
  );

  const newTab = useCallback(
    (currentNote: string): boolean => {
      if (!session || session.tabs.length >= MAX_TABS) return false;

      const fromRoomId = session.activeRoomId;
      const freshRoom = createRoomId();
      onRoomCreatedRef.current?.(freshRoom);
      applySession(
        (prev) => ({
          tabs: [...prev.tabs, { roomId: freshRoom }],
          activeRoomId: freshRoom,
        }),
        { fromRoomId, currentNote },
      );
      return true;
    },
    [applySession, session],
  );

  const openRoom = useCallback(
    (roomId: string, currentNote: string): boolean => {
      if (!session) return false;
      const fromRoomId = session.activeRoomId;
      if (fromRoomId === roomId) return true;
      if (session.tabs.some((tab) => tab.roomId === roomId)) {
        selectTab(roomId, currentNote);
        return true;
      }
      if (session.tabs.length >= MAX_TABS) return false;
      applySession(
        (prev) => ({
          tabs: [...prev.tabs, { roomId }],
          activeRoomId: roomId,
        }),
        { fromRoomId, currentNote },
      );
      return true;
    },
    [applySession, selectTab, session],
  );

  const renameTab = useCallback(
    (roomId: string, title: string) => {
      const trimmed = title.trim();
      setSession((prev) => {
        if (!prev) return prev;
        const tabs = prev.tabs.map((tab) => {
          if (tab.roomId !== roomId) return tab;
          if (!trimmed) {
            return { roomId: tab.roomId };
          }
          return { ...tab, customTitle: trimmed };
        });
        const next = { ...prev, tabs };
        saveTabSession(next);
        return next;
      });
    },
    [],
  );

  const updateDerivedTitle = useCallback((roomId: string, note: string) => {
    if (deriveTimerRef.current) clearTimeout(deriveTimerRef.current);
    deriveTimerRef.current = setTimeout(() => {
      const title = deriveDocumentTitle(note);
      setDerivedTitles((prev) => {
        if (prev[roomId] === title) return prev;
        return { ...prev, [roomId]: title };
      });
    }, 500);
  }, []);

  useEffect(() => {
    return () => {
      if (deriveTimerRef.current) clearTimeout(deriveTimerRef.current);
    };
  }, []);

  return {
    tabs: session?.tabs ?? [],
    activeRoomId: session?.activeRoomId ?? null,
    derivedTitles,
    canNewTab: (session?.tabs.length ?? 0) < MAX_TABS,
    selectTab,
    closeTab,
    newTab,
    openRoom,
    renameTab,
    updateDerivedTitle,
  };
}
