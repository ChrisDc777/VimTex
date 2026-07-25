"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { resolveTabTitle } from "@/lib/document-title";
import { MAX_TABS, type EditorTab } from "@/lib/tab-storage";

type EditorTabBarProps = {
  tabs: EditorTab[];
  activeRoomId: string;
  derivedTitles: Record<string, string>;
  canNewTab: boolean;
  onSelect: (roomId: string) => void;
  onClose: (roomId: string) => void;
  onNew: () => void;
  onRename: (roomId: string, title: string) => void;
};

export function EditorTabBar({
  tabs,
  activeRoomId,
  derivedTitles,
  canNewTab,
  onSelect,
  onClose,
  onNew,
  onRename,
}: EditorTabBarProps) {
  const tablistId = useId();
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  const getTitle = useCallback(
    (tab: EditorTab) =>
      resolveTabTitle(
        tab.customTitle,
        derivedTitles[tab.roomId] ?? "Untitled",
      ),
    [derivedTitles],
  );

  const startRename = useCallback(
    (tab: EditorTab) => {
      setEditingRoomId(tab.roomId);
      setRenameValue(getTitle(tab));
    },
    [getTitle],
  );

  const commitRename = useCallback(() => {
    if (!editingRoomId) return;
    onRename(editingRoomId, renameValue);
    setEditingRoomId(null);
    setRenameValue("");
  }, [editingRoomId, onRename, renameValue]);

  const cancelRename = useCallback(() => {
    setEditingRoomId(null);
    setRenameValue("");
  }, []);

  useEffect(() => {
    if (editingRoomId) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [editingRoomId]);

  const onTabKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
      if (event.key === "ArrowLeft" && index > 0) {
        event.preventDefault();
        const prev = tabs[index - 1];
        if (prev) onSelect(prev.roomId);
      } else if (event.key === "ArrowRight" && index < tabs.length - 1) {
        event.preventDefault();
        const next = tabs[index + 1];
        if (next) onSelect(next.roomId);
      }
    },
    [onSelect, tabs],
  );

  return (
    <header className="vt-editor-tabs">
      <div
        id={tablistId}
        role="tablist"
        aria-label="Open documents"
        className="vt-editor-tabs__list"
      >
        {tabs.map((tab, index) => {
          const active = tab.roomId === activeRoomId;
          const title = getTitle(tab);
          const editing = editingRoomId === tab.roomId;
          const showClose = tabs.length > 1;

          return (
            <div
              key={tab.roomId}
              className={`vt-editor-tab${active ? " vt-editor-tab--active" : ""}`}
            >
              {editing ? (
                <input
                  ref={renameInputRef}
                  type="text"
                  className="vt-editor-tab__rename"
                  value={renameValue}
                  aria-label="Rename tab"
                  onChange={(event) => setRenameValue(event.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      commitRename();
                    } else if (event.key === "Escape") {
                      event.preventDefault();
                      cancelRename();
                    }
                  }}
                />
              ) : (
                <button
                  type="button"
                  role="tab"
                  id={`${tablistId}-tab-${tab.roomId}`}
                  aria-selected={active}
                  aria-controls={`${tablistId}-panel-${tab.roomId}`}
                  tabIndex={active ? 0 : -1}
                  className="vt-editor-tab__select"
                  onClick={() => onSelect(tab.roomId)}
                  onDoubleClick={() => startRename(tab)}
                  onKeyDown={(event) => onTabKeyDown(event, index)}
                >
                  <span className="vt-editor-tab__label vt-title">{title}</span>
                </button>
              )}

              {showClose && !editing ? (
                <button
                  type="button"
                  className="vt-editor-tab__close"
                  aria-label={`Close ${title}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onClose(tab.roomId);
                  }}
                >
                  <CloseIcon />
                </button>
              ) : null}
            </div>
          );
        })}
        <button
          type="button"
          className="vt-editor-tabs__new"
          aria-label="New tab"
          title={canNewTab ? "New tab" : `Maximum ${MAX_TABS} tabs`}
          disabled={!canNewTab}
          onClick={onNew}
        >
          <PlusIcon />
        </button>
      </div>
    </header>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M3.5 3.5 10.5 10.5M10.5 3.5 3.5 10.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M7 3.5v7M3.5 7h7"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}
