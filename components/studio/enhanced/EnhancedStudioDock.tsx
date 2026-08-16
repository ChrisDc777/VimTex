"use client";

import { History, ListTree, MessageSquare, Settings2 } from "lucide-react";
import { Dock, DockItem, DockSeparator } from "@/components/beui/motion/dock";
import { EnhancedShareRoom } from "@/components/studio/enhanced/EnhancedShareRoom";
import { formatShortcut } from "@/components/ShortcutHint";
import { aiFeatureEnabled } from "@/lib/ai-features";
import type { RoomMetaPublic } from "@/lib/room-meta";
import { openPreferences } from "@/lib/ui-events";

type EnhancedStudioDockProps = {
  ready: boolean;
  roomId: string | null;
  readOnly?: boolean;
  outlineOpen: boolean;
  historyOpen: boolean;
  chatOpen: boolean;
  onToggleOutline: () => void;
  onToggleHistory: () => void;
  onToggleChat: () => void;
  onEditSecret?: (edit: string) => void;
  onSavedSettings?: (meta: RoomMetaPublic) => void;
};

/** Bottom dock: Share / Outline / History / Chat / Preferences (Import & Export lives in the topbar). */
export function EnhancedStudioDock({
  ready,
  roomId,
  readOnly = false,
  outlineOpen,
  historyOpen,
  chatOpen,
  onToggleOutline,
  onToggleHistory,
  onToggleChat,
  onEditSecret,
  onSavedSettings,
}: EnhancedStudioDockProps) {
  const showOutline = aiFeatureEnabled("studio", "outlineTodo");
  const chatShortcut = formatShortcut({ mod: true, shift: true, key: "C" });
  const showShare = Boolean(roomId) && !readOnly;

  return (
    <div className="vt-studio-dock pointer-events-none absolute inset-x-0 bottom-3 z-40 flex justify-center px-3">
      <Dock
        size={42}
        className="pointer-events-auto border-hairline bg-[color-mix(in_srgb,var(--canvas-elevated)_88%,transparent)] text-ink shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
      >
        {showShare && roomId ? (
          <EnhancedShareRoom
            roomId={roomId}
            disabled={!ready}
            onEditSecret={onEditSecret}
            onSavedSettings={onSavedSettings}
          />
        ) : null}
        {showOutline ? (
          <DockItem
            active={outlineOpen}
            disabled={!ready}
            aria-label="Outline"
            tooltip={outlineOpen ? "Close outline" : "Outline"}
            onClick={onToggleOutline}
          >
            <ListTree className="size-4" aria-hidden />
          </DockItem>
        ) : null}
        <DockItem
          active={historyOpen}
          disabled={!ready || !roomId}
          aria-label="History"
          tooltip={historyOpen ? "Close history" : "History"}
          onClick={onToggleHistory}
        >
          <History className="size-4" aria-hidden />
        </DockItem>
        <DockItem
          active={chatOpen}
          disabled={!ready}
          aria-label="Chat"
          tooltip={
            chatOpen
              ? `Close chat (${chatShortcut})`
              : `Chat (${chatShortcut})`
          }
          onClick={onToggleChat}
        >
          <MessageSquare className="size-4" aria-hidden />
        </DockItem>
        <DockSeparator className="bg-hairline" />
        <DockItem
          aria-label="Preferences"
          tooltip="Preferences"
          onClick={() => openPreferences()}
        >
          <Settings2 className="size-4" aria-hidden />
        </DockItem>
      </Dock>
    </div>
  );
}
