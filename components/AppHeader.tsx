"use client";

import { ShareRoom } from "@/components/ShareRoom";
import { SheetMenu } from "@/components/SheetMenu";

type AppHeaderProps = {
  ready: boolean;
  roomId: string | null;
  note: string;
  canNewSheet?: boolean;
  onNewSheet: () => void;
};

export function AppHeader({
  ready,
  roomId,
  note,
  canNewSheet = true,
  onNewSheet,
}: AppHeaderProps) {
  return (
    <header className="vt-header vt-chrome border-b">
      <div className="vt-header__brand vt-brand">
        <span className="vt-header__title">VimTex</span>
      </div>

      <div className="vt-header__nav">
        <div className="vt-header__actions" aria-label="Collaboration and file">
          {roomId ? <ShareRoom roomId={roomId} /> : null}
          <SheetMenu
            note={note}
            disabled={!ready}
            canNewSheet={canNewSheet}
            onNewSheet={onNewSheet}
          />
        </div>
      </div>
    </header>
  );
}
