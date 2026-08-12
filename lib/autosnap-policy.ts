/**
 * Pure autosnapshot coalescing (#126).
 * Client-side skip rules; the server still hash-dedupes within 5 minutes.
 */

export function hashNoteForAutosnap(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export type AutosnapDecision =
  | { ok: true; hash: string }
  | { ok: false; reason: "disabled" | "readonly" | "in_flight" | "empty" | "unchanged" };

export function shouldCreateAutosnap(opts: {
  enabled: boolean;
  readOnly: boolean;
  inFlight: boolean;
  text: string;
  lastHash: string | null;
}): AutosnapDecision {
  if (!opts.enabled) return { ok: false, reason: "disabled" };
  if (opts.readOnly) return { ok: false, reason: "readonly" };
  if (opts.inFlight) return { ok: false, reason: "in_flight" };
  if (!opts.text.trim()) return { ok: false, reason: "empty" };
  const hash = hashNoteForAutosnap(opts.text);
  if (opts.lastHash === hash) return { ok: false, reason: "unchanged" };
  return { ok: true, hash };
}

export function formatAutosnapLabel(
  kind: "auto_idle" | "auto_interval",
  at: number = Date.now(),
): string {
  const time = new Date(at).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return kind === "auto_idle" ? `Auto · ${time}` : `Auto interval · ${time}`;
}
