"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AI_CHROME_PREFS_EVENT,
  loadAiChromePrefs,
  saveAiChromePref,
  type AiChromePrefs,
} from "@/lib/ai-chrome-prefs";

export function useAiChromePrefs() {
  const [prefs, setPrefs] = useState<AiChromePrefs>(() => loadAiChromePrefs());

  useEffect(() => {
    const sync = () => setPrefs(loadAiChromePrefs());
    window.addEventListener(AI_CHROME_PREFS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(AI_CHROME_PREFS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setPref = useCallback(
    <K extends keyof AiChromePrefs>(key: K, value: AiChromePrefs[K]) => {
      saveAiChromePref(key, value);
      setPrefs(loadAiChromePrefs());
    },
    [],
  );

  return { prefs, setPref };
}
