"use client";

import { useEffect, useState } from "react";
import { ClassicShell } from "@/components/shells/ClassicShell";
import { QuietCraftShell } from "@/components/shells/QuietCraftShell";
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

  if (uiVariant === "quietCraft") {
    return (
      <QuietCraftShell
        uiVariant={uiVariant}
        onUiVariantChange={handleVariantChange}
      />
    );
  }

  return (
    <ClassicShell
      uiVariant={uiVariant}
      onUiVariantChange={handleVariantChange}
    />
  );
}
