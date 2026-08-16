"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  DEFAULT_STUDIO_EXPERIENCE,
  loadStudioExperience,
  saveStudioExperience,
  STUDIO_EXPERIENCE_EVENT,
  type StudioExperience,
} from "@/lib/studio-experience-prefs";

/** Stable server/hydration snapshot — Enhanced default, no flash to Basic. */
const SERVER_SNAPSHOT: StudioExperience = DEFAULT_STUDIO_EXPERIENCE;

let cachedClient: StudioExperience | null = null;

function readClient(): StudioExperience {
  const next = loadStudioExperience();
  if (cachedClient !== next) cachedClient = next;
  return cachedClient;
}

function subscribe(onStoreChange: () => void): () => void {
  const sync = () => {
    cachedClient = null;
    onStoreChange();
  };
  window.addEventListener(STUDIO_EXPERIENCE_EVENT, sync);
  window.addEventListener("storage", sync);
  return () => {
    window.removeEventListener(STUDIO_EXPERIENCE_EVENT, sync);
    window.removeEventListener("storage", sync);
  };
}

export function useStudioExperience(): {
  experience: StudioExperience;
  setExperience: (next: StudioExperience) => void;
  isEnhanced: boolean;
} {
  const experience = useSyncExternalStore(
    subscribe,
    readClient,
    () => SERVER_SNAPSHOT,
  );

  const setExperience = useCallback((next: StudioExperience) => {
    saveStudioExperience(next);
    cachedClient = next;
  }, []);

  return {
    experience,
    setExperience,
    isEnhanced: experience === "enhanced",
  };
}
