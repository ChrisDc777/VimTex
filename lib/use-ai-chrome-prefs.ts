"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AI_CHROME_PREFS_EVENT,
  applySlashTokenStyleToDocument,
  loadAiChromePrefs,
  saveAiChromePref,
  toggleEnabledSlashCommand,
  type AiChromePrefs,
} from "@/lib/ai-chrome-prefs";
import type { SlashCommandId } from "@/lib/slash-commands";

export function useAiChromePrefs() {
  const [prefs, setPrefs] = useState<AiChromePrefs>(() => loadAiChromePrefs());

  useEffect(() => {
    const sync = () => {
      const next = loadAiChromePrefs();
      setPrefs(next);
      applySlashTokenStyleToDocument(next.slashTokenStyle);
    };
    sync();
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

  const setSlashCommandEnabled = useCallback(
    (id: SlashCommandId, enabled: boolean) => {
      toggleEnabledSlashCommand(id, enabled);
      setPrefs(loadAiChromePrefs());
    },
    [],
  );

  return { prefs, setPref, setSlashCommandEnabled };
}
