"use client";

import { Drawer } from "@/components/beui/motion/drawer";
import { PreferencesDialog } from "@/components/PreferencesDialog";
import type { ComponentProps } from "react";

type EnhancedPreferencesDrawerProps = Omit<
  ComponentProps<typeof PreferencesDialog>,
  "surface" | "showStudioExperience"
>;

export function EnhancedPreferencesDrawer({
  open,
  onClose,
  ...prefs
}: EnhancedPreferencesDrawerProps) {
  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      side="right"
      ariaLabel="Preferences"
      className="w-full max-w-md border-l border-hairline bg-canvas"
    >
      <PreferencesDialog
        {...prefs}
        open={open}
        onClose={onClose}
        surface="panel"
        showStudioExperience
      />
    </Drawer>
  );
}
