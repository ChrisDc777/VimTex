"use client";

import { useEffect, useState } from "react";
import { AppLoadingShell } from "@/components/shells/AppLoadingShell";
import { StudioShell } from "@/components/shells/StudioShell";
import { ForgeShell } from "@/components/shells/ForgeShell";
import {
  DEFAULT_UI_VARIANT,
  loadUiVariant,
  saveUiVariant,
  type UiVariant,
} from "@/lib/ui-variant";

export function AppRoot() {
  const [hydrated, setHydrated] = useState(false);
  const [uiVariant, setUiVariant] = useState<UiVariant>(DEFAULT_UI_VARIANT);

  useEffect(() => {
    setUiVariant(loadUiVariant());
    setHydrated(true);
  }, []);

  const handleVariantChange = (variant: UiVariant) => {
    saveUiVariant(variant);
    setUiVariant(variant);
  };

  if (!hydrated) {
    return <AppLoadingShell />;
  }

  if (uiVariant === "forge") {
    return (
      <ForgeShell
        uiVariant={uiVariant}
        onUiVariantChange={handleVariantChange}
      />
    );
  }

  return (
    <StudioShell
      uiVariant={uiVariant}
      onUiVariantChange={handleVariantChange}
    />
  );
}
