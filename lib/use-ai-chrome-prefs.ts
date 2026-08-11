"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AI_CHROME_PREFS_EVENT,
  applySlashTokenStyleToDocument,
  loadAiChromePrefs,
  removeCustomSlashCommand,
  saveAiChromePref,
  saveCustomSlashCommand,
  toggleEnabledSlashCommand,
  type AiChromePrefs,
} from "@/lib/ai-chrome-prefs";
import type {
  BuiltinSlashCommandId,
  CustomSlashCommand,
} from "@/lib/slash-commands";

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
    (id: BuiltinSlashCommandId, enabled: boolean) => {
      toggleEnabledSlashCommand(id, enabled);
      setPrefs(loadAiChromePrefs());
    },
    [],
  );

  const upsertCustomSlash = useCallback((command: CustomSlashCommand) => {
    const ok = saveCustomSlashCommand(command);
    setPrefs(loadAiChromePrefs());
    return ok;
  }, []);

  const deleteCustomSlash = useCallback((id: string) => {
    removeCustomSlashCommand(id);
    setPrefs(loadAiChromePrefs());
  }, []);

  return {
    prefs,
    setPref,
    setSlashCommandEnabled,
    upsertCustomSlash,
    deleteCustomSlash,
  };
}
