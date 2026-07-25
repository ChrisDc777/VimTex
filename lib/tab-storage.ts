import { createRoomId } from "./collab";

export const MAX_TABS = 5;

const TAB_SESSION_KEY = "vimtex:tabs";

export type EditorTab = {
  roomId: string;
  customTitle?: string;
};

export type TabSession = {
  tabs: EditorTab[];
  activeRoomId: string;
};

function isEditorTab(value: unknown): value is EditorTab {
  if (!value || typeof value !== "object") return false;
  const tab = value as EditorTab;
  return typeof tab.roomId === "string" && tab.roomId.length > 0;
}

function normalizeSession(session: TabSession): TabSession {
  const seen = new Set<string>();
  const tabs: EditorTab[] = [];

  for (const tab of session.tabs) {
    if (!isEditorTab(tab) || seen.has(tab.roomId)) continue;
    seen.add(tab.roomId);
    tabs.push({
      roomId: tab.roomId,
      ...(tab.customTitle?.trim()
        ? { customTitle: tab.customTitle.trim() }
        : {}),
    });
    if (tabs.length >= MAX_TABS) break;
  }

  if (tabs.length === 0) {
    const roomId = createRoomId();
    return { tabs: [{ roomId }], activeRoomId: roomId };
  }

  const activeRoomId = tabs.some((tab) => tab.roomId === session.activeRoomId)
    ? session.activeRoomId
    : tabs[0]!.roomId;

  return { tabs, activeRoomId };
}

export function loadTabSession(): TabSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TAB_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TabSession;
    if (!parsed || !Array.isArray(parsed.tabs)) return null;
    return normalizeSession(parsed);
  } catch {
    return null;
  }
}

export function saveTabSession(session: TabSession): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      TAB_SESSION_KEY,
      JSON.stringify(normalizeSession(session)),
    );
  } catch {
    // Quota or private browsing — ignore.
  }
}

export function createInitialTabSession(urlRoomId?: string | null): TabSession {
  const roomId = urlRoomId?.trim() || createRoomId();
  return { tabs: [{ roomId }], activeRoomId: roomId };
}

/**
 * Ensure the URL room is represented in the tab list.
 * If at capacity, evict the least-recently-used inactive tab.
 */
export function mergeUrlRoomIntoSession(
  session: TabSession,
  urlRoomId: string,
): TabSession {
  const normalized = normalizeSession(session);
  const existingIndex = normalized.tabs.findIndex(
    (tab) => tab.roomId === urlRoomId,
  );

  if (existingIndex >= 0) {
    return {
      tabs: normalized.tabs,
      activeRoomId: urlRoomId,
    };
  }

  const nextTab: EditorTab = { roomId: urlRoomId };
  if (normalized.tabs.length < MAX_TABS) {
    return {
      tabs: [...normalized.tabs, nextTab],
      activeRoomId: urlRoomId,
    };
  }

  const inactiveIndex = normalized.tabs.findIndex(
    (tab) => tab.roomId !== normalized.activeRoomId,
  );
  const evictIndex = inactiveIndex >= 0 ? inactiveIndex : 0;
  const tabs = [...normalized.tabs];
  tabs[evictIndex] = nextTab;

  return {
    tabs,
    activeRoomId: urlRoomId,
  };
}
