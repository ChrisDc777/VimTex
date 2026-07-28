"use client";

import type { ReactNode } from "react";
import { AnimatedBrandLogo } from "@/components/AnimatedBrandLogo";
import { ShareRoom } from "@/components/ShareRoom";
import { SheetMenu } from "@/components/SheetMenu";

type AppHeaderProps = {
  ready: boolean;
  note: string;
  canNewSheet?: boolean;
  onNewSheet: () => void;
  roomId?: string | null;
  headerExtra?: ReactNode;
  uiVariant?: import("@/lib/ui-variant").UiVariant;
  onUiVariantChange?: (variant: import("@/lib/ui-variant").UiVariant) => void;
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
}: AppHeaderProps) {
  return (
    <header className="vt-header vt-chrome border-b">
      <div className="vt-header__brand">
        <AnimatedBrandLogo />
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
          />
        </div>
      </div>
    </header>
  );
}
