"use client";

import { CloseIcon } from "@/components/chat/icons";
import { ChatIcon, HistoryIcon } from "@/components/SidePanelRail";

export type RightPanelTab = "chat" | "history";

export type RightPanelSwitcherProps = {
  active: RightPanelTab;
  onSelectChat: () => void;
  onSelectHistory: () => void;
  onClose: () => void;
};

/** Compact Chat / History tabs for the right side panel. */
export function RightPanelSwitcher({
  active,
  onSelectChat,
  onSelectHistory,
  onClose,
}: RightPanelSwitcherProps) {
  return (
    <div className="vt-right-panel-switcher">
      <div className="vt-right-panel-switcher__tabs" role="tablist" aria-label="Right panel">
        <button
          type="button"
          role="tab"
          aria-selected={active === "chat"}
          className={
            active === "chat"
              ? "vt-right-panel-switcher__tab vt-right-panel-switcher__tab--active"
              : "vt-right-panel-switcher__tab"
          }
          onClick={onSelectChat}
        >
          <ChatIcon />
          <span>Chat</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={active === "history"}
          className={
            active === "history"
              ? "vt-right-panel-switcher__tab vt-right-panel-switcher__tab--active"
              : "vt-right-panel-switcher__tab"
          }
          onClick={onSelectHistory}
        >
          <HistoryIcon />
          <span>History</span>
        </button>
      </div>
      <button
        type="button"
        className="vt-right-panel-switcher__close"
        onClick={onClose}
        aria-label="Close panel"
      >
        <CloseIcon />
      </button>
    </div>
  );
}
