"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { MATH_SNIPPETS, type MathSnippet } from "@/lib/snippets";

type SnippetMenuProps = {
  disabled?: boolean;
  onInsert: (snippet: MathSnippet) => void;
  /** Classes for the trigger button (per-shell styling). */
  triggerClassName?: string;
  /** Classes for the text label inside the trigger. */
  labelClassName?: string;
};

type AnchorRect = {
  top: number;
  right: number;
};

export function SnippetMenu({
  disabled,
  onInsert,
  triggerClassName = "vt-pill vt-pill--ghost",
  labelClassName = "hidden sm:inline",
}: SnippetMenuProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [anchor, setAnchor] = useState<AnchorRect | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuId = useId();
  const titleId = useId();

  const filtered = MATH_SNIPPETS.filter((s) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return `${s.label} ${s.keywords}`.toLowerCase().includes(q);
  });

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onScroll = (event: Event) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const timeout = window.setTimeout(() => {
      document.addEventListener("pointerdown", close);
    }, 0);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  const run = (snippet: MathSnippet) => {
    onInsert(snippet);
    setOpen(false);
  };

  const toggleOpen = () => {
    const next = !open;
    if (next) {
      const button = rootRef.current?.querySelector<HTMLElement>("button");
      if (!button) return;
      const rect = button.getBoundingClientRect();
      setAnchor({ top: rect.bottom, right: rect.right });
    }
    setOpen(next);
  };

  const menuStyle: CSSProperties | undefined = anchor
    ? {
        position: "fixed",
        top: anchor.top + 6,
        right: Math.max(8, window.innerWidth - anchor.right),
        zIndex: 999,
        width: "min(20rem, calc(100vw - 2rem))",
      }
    : undefined;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        className={triggerClassName}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Insert math snippet"
        title="Insert math snippet"
        onClick={toggleOpen}
      >
        <span aria-hidden className="shrink-0">
          Σ
        </span>
        <span className={labelClassName}>TeX</span>
      </button>

      {open && anchor
        ? createPortal(
            <div
              id={menuId}
              ref={menuRef}
              style={menuStyle}
              className="vt-snippet-pop"
              role="listbox"
              aria-label="Math snippets"
              aria-labelledby={titleId}
            >
              <div className="vt-snippet-pop__search">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search snippets…"
                  aria-label="Search math snippets"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-mute"
                />
              </div>
              <p id={titleId} className="vt-caption px-3 pb-1 pt-2 text-mute">
                Math snippets
              </p>
              <div className="vt-snippet-pop__list">
                {filtered.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-mute">
                    No matching snippet.
                  </p>
                ) : (
                  filtered.map((snippet) => (
                    <button
                      key={snippet.id}
                      type="button"
                      role="option"
                      aria-selected="false"
                      onClick={() => run(snippet)}
                      className="vt-snippet-pop__item"
                    >
                      <span className="vt-snippet-pop__label">
                        {snippet.label}
                      </span>
                      <code className="vt-snippet-pop__preview">
                        {snippet.snippet.replace(
                          /[\uE000\uE001\uE002]/g,
                          "·",
                        )}
                      </code>
                    </button>
                  ))
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
