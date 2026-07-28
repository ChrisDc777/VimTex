"use client";

import { useEffect, useState } from "react";
import { StudioShell } from "@/components/shells/StudioShell";
import { ForgeShell } from "@/components/shells/ForgeShell";
import {
  DEFAULT_UI_VARIANT,
  loadUiVariant,
  saveUiVariant,
  type UiVariant,
} from "@/lib/ui-variant";

export default function HomePage() {
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
    return (
      <div className="app-shell flex h-dvh items-center justify-center text-sm text-mute">
        Loading VimTex…
      </div>
    );
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
