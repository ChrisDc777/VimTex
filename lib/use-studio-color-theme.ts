"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  DEFAULT_STUDIO_APPEARANCE,
  DEFAULT_STUDIO_COLOR_THEME,
  loadStudioAppearance,
  loadStudioColorTheme,
  saveStudioAppearance,
  saveStudioColorTheme,
  STUDIO_COLOR_THEME_EVENT,
  type StudioAppearance,
  type StudioColorThemeId,
} from "@/lib/studio-color-theme";

let cachedTheme: StudioColorThemeId | null = null;
let cachedAppearance: StudioAppearance | null = null;

function readTheme(): StudioColorThemeId {
  const next = loadStudioColorTheme();
  if (cachedTheme !== next) cachedTheme = next;
  return cachedTheme;
}

function readAppearance(): StudioAppearance {
  const next = loadStudioAppearance();
  if (cachedAppearance !== next) cachedAppearance = next;
  return cachedAppearance;
}

function subscribe(onStoreChange: () => void): () => void {
  const sync = () => {
    cachedTheme = null;
    cachedAppearance = null;
    onStoreChange();
  };
  window.addEventListener(STUDIO_COLOR_THEME_EVENT, sync);
  window.addEventListener("storage", sync);
  return () => {
    window.removeEventListener(STUDIO_COLOR_THEME_EVENT, sync);
    window.removeEventListener("storage", sync);
  };
}

export function useStudioColorTheme(): {
  theme: StudioColorThemeId;
  appearance: StudioAppearance;
  setTheme: (theme: StudioColorThemeId) => void;
  setAppearance: (appearance: StudioAppearance) => void;
} {
  const theme = useSyncExternalStore(
    subscribe,
    readTheme,
    () => DEFAULT_STUDIO_COLOR_THEME,
  );
  const appearance = useSyncExternalStore(
    subscribe,
    readAppearance,
    () => DEFAULT_STUDIO_APPEARANCE,
  );

  const setTheme = useCallback((next: StudioColorThemeId) => {
    saveStudioColorTheme(next);
    cachedTheme = next;
  }, []);

  const setAppearance = useCallback((next: StudioAppearance) => {
    saveStudioAppearance(next);
    cachedAppearance = next;
  }, []);

  return { theme, appearance, setTheme, setAppearance };
}
