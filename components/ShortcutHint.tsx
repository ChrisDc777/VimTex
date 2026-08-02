"use client";

type ShortcutHintProps = {
  shortcuts: Array<{ keys: string; label: string }>;
  className?: string;
};

export const MOD_LABEL =
  typeof navigator !== "undefined" && /Mac/i.test(navigator.platform)
    ? "⌘"
    : "Ctrl";

export function ShortcutHint({ shortcuts, className }: ShortcutHintProps) {
  return (
    <div className={`vt-footer__hint ${className ?? ""}`} aria-hidden="true">
      {shortcuts.map((s, i) => (
        <span key={s.keys} className="vt-footer__hint-item">
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
