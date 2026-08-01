"use client";

import type { ReactNode } from "react";
import { AnimatedBrandLogo } from "@/components/AnimatedBrandLogo";
import { ShareRoom } from "@/components/ShareRoom";
import { SheetMenu } from "@/components/SheetMenu";
import type { EditorMode } from "@/lib/editor-mode";
import type { RecentRoom } from "@/lib/recent-rooms";

type AppHeaderProps = {
  ready: boolean;
  note: string;
  canNewSheet?: boolean;
  onNewSheet: () => void;
  roomId?: string | null;
  headerExtra?: ReactNode;
  uiVariant?: import("@/lib/ui-variant").UiVariant;
  onUiVariantChange?: (variant: import("@/lib/ui-variant").UiVariant) => void;
  relativeLineNumbers?: boolean;
  onRelativeLineNumbersChange?: (enabled: boolean) => void;
  editorMode?: EditorMode;
  onEditorModeChange?: (mode: EditorMode) => void;
  recentRooms?: RecentRoom[];
  onClearRecentRooms?: () => void;
  onOpenRoom?: (roomId: string) => void;
  openRoomIds?: ReadonlySet<string>;
  /** When true the editor buffer is empty — brand animation stays active. */
  canvasBlank?: boolean;
};

export function AppHeader({
  ready,
  note,
  canNewSheet = true,
  onNewSheet,
  roomId,
  headerExtra,
  uiVariant,
  onUiVariantChange,
  relativeLineNumbers,
  onRelativeLineNumbersChange,
  editorMode,
  onEditorModeChange,
  recentRooms,
  onClearRecentRooms,
  onOpenRoom,
  openRoomIds,
  canvasBlank = true,
}: AppHeaderProps) {
  return (
    <header className="vt-header vt-chrome border-b">
      <div className="vt-header__brand">
        <AnimatedBrandLogo canvasBlank={canvasBlank} />
      </div>

      <div className="vt-header__nav">
        <div className="vt-header__actions" aria-label="File">
          {roomId ? <ShareRoom roomId={roomId} /> : null}
          {headerExtra}
          <SheetMenu
            note={note}
            disabled={!ready}
            canNewSheet={canNewSheet}
            onNewSheet={onNewSheet}
            uiVariant={uiVariant}
            onUiVariantChange={onUiVariantChange}
            relativeLineNumbers={relativeLineNumbers}
            onRelativeLineNumbersChange={onRelativeLineNumbersChange}
            editorMode={editorMode}
            onEditorModeChange={onEditorModeChange}
            recentRooms={recentRooms}
            onClearRecentRooms={onClearRecentRooms}
            onOpenRoom={onOpenRoom}
            openRoomIds={openRoomIds}
          />
        </div>
      </div>
    </header>
  );
}
