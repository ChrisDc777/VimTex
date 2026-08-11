"use client";

type ShortcutHintProps = {
  shortcuts: Array<{ keys: string; label: string }>;
  className?: string;
};

export function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const platform =
    // Chromium userAgentData when available
    (
      navigator as Navigator & {
        userAgentData?: { platform?: string };
      }
    ).userAgentData?.platform ??
    navigator.platform ??
    "";
  if (/Mac|iPhone|iPad|iPod/i.test(platform)) return true;
  return /Mac OS X|Macintosh|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/** Primary modifier: ⌘ on Apple, Ctrl elsewhere. */
export const MOD_LABEL = isApplePlatform() ? "⌘" : "Ctrl";

/** Shift chord token for display. */
export const SHIFT_LABEL = isApplePlatform() ? "⇧" : "Shift";

type ShortcutParts = {
  mod?: boolean;
  shift?: boolean;
  alt?: boolean;
  /** Final key, e.g. "K" or "," */
  key: string;
};

/**
 * Platform-native shortcut label.
 * Apple: ⌘⇧C · Windows/Linux: Ctrl+Shift+C
 */
export function formatShortcut({
  mod,
  shift,
  alt,
  key,
}: ShortcutParts): string {
  const apple = isApplePlatform();
  const parts: string[] = [];
  if (mod) parts.push(apple ? "⌘" : "Ctrl");
  if (shift) parts.push(apple ? "⇧" : "Shift");
  if (alt) parts.push(apple ? "⌥" : "Alt");
  parts.push(key);
  return apple ? parts.join("") : parts.join("+");
}

export function ShortcutHint({ shortcuts, className }: ShortcutHintProps) {
  return (
    <div className={`vt-footer__hint ${className ?? ""}`} aria-hidden="true">
      {shortcuts.map((s, i) => (
        <span key={`${s.keys}-${s.label}`} className="vt-footer__hint-item">
          {i > 0 ? (
            <span className="vt-footer__hint-sep" aria-hidden>
              ·
            </span>
          ) : null}
          <span className="vt-kbd">{s.keys}</span>
          <span className="vt-footer__hint-label">{s.label}</span>
        </span>
      ))}
    </div>
  );
}
