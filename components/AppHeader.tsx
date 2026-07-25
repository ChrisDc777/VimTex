"use client";

import { SheetMenu } from "@/components/SheetMenu";

type AppHeaderProps = {
  ready: boolean;
  note: string;
  canNewSheet?: boolean;
  onNewSheet: () => void;
  onPremiumLiveShare: () => void;
};

export function AppHeader({
  ready,
  note,
  canNewSheet = true,
  onNewSheet,
  onPremiumLiveShare,
}: AppHeaderProps) {
  return (
    <header className="vt-header vt-chrome border-b">
      <div className="vt-header__brand vt-brand">
        <span className="vt-header__title">VimTex</span>
      </div>

      <div className="vt-header__nav">
        <div className="vt-header__actions" aria-label="File">
          <SheetMenu
            note={note}
            disabled={!ready}
            canNewSheet={canNewSheet}
            onNewSheet={onNewSheet}
            onPremiumLiveShare={onPremiumLiveShare}
          />
        </div>
      </div>
    </header>
  );
}
