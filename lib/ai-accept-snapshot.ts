/**
 * Pure helpers for optional room snapshot on AI Confirm Accept (#89).
 * Restore via Version history replaces the shared note for the whole room.
 */

import type { AiEditSource } from "./ai-review-store";

const SOURCE_LABEL: Record<AiEditSource, string> = {
  chat: "chat",
  selection: "selection",
  slash: "slash",
  diagnostics: "diagnostics",
};

/**
 * Short checkpoint label, e.g. `Before AI: chat · 5:21 PM`.
 */
export function formatAiAcceptSnapshotLabel(
  source: AiEditSource,
  at: number = Date.now(),
): string {
  const sourceLabel = SOURCE_LABEL[source] ?? source;
  const time = new Date(at).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `Before AI: ${sourceLabel} · ${time}`;
}
