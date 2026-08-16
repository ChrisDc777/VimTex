"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { SafeSvg } from "@/components/SafeSvg";
import {
  buildVimTexCommands,
  type CommandCatalogInput,
} from "@/lib/command-catalog";
import type { UiVariant } from "@/lib/ui-variant";
import type { EditorMode } from "@/lib/editor-mode";
import type { NewRoomOptions, ViewMode } from "@/lib/types";

export type CommandPaletteProps = CommandCatalogInput & {
  open: boolean;
  onClose: () => void;
  roomId: string | null;
  note: string;
  editorMode: EditorMode;
  uiVariant: UiVariant;
  chatOpen: boolean;
  onNewRoom: (opts?: NewRoomOptions) => void;
  onOpenSheetPicker: () => void;
  onEditorModeChange: (mode: EditorMode) => void;
  onUiVariantChange: (variant: UiVariant) => void;
  onToggleChat: () => void;
  onOpenCheatsheet: () => void;
  onOpenPreferences: () => void;
  onOpenOnboarding: () => void;
  onSaveAsTemplate: () => void;
  /** Split/Live shell (Studio) — adds the view-mode switch command. */
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  /** Forge — adds a "Toggle preview" command (no Split/Live toggle there). */
  onTogglePreview?: () => void;
  /** Studio outline panel (#56). */
  outlineOpen?: boolean;
  onToggleOutline?: () => void;
};

function CommandGlyph() {
  return (
    <SafeSvg
      width={13}
      height={13}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="shrink-0 opacity-50"
    >
      <path
        d="M3 7.75 6.5 4 10 7.75M6.5 4v8"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SafeSvg>
  );
}

export function CommandPalette({
  open,
  onClose,
  roomId,
  note,
  viewMode,
  editorMode,
  uiVariant,
  chatOpen,
  onNewRoom,
  onOpenSheetPicker,
  onViewModeChange,
  onEditorModeChange,
  onUiVariantChange,
  onToggleChat,
  onTogglePreview,
  onOpenCheatsheet,
  onOpenPreferences,
  onOpenOnboarding,
  onSaveAsTemplate,
  outlineOpen,
  onToggleOutline,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const paletteLabel = "Command palette";

  const runAndClose = useCallback(
    (run: () => void) => {
      run();
      onClose();
    },
    [onClose],
  );

  const commands = useMemo(
    () =>
      buildVimTexCommands({
        roomId,
        note,
        viewMode,
        editorMode,
        uiVariant,
        chatOpen,
        outlineOpen,
        onNewRoom,
        onOpenSheetPicker,
        onViewModeChange,
        onEditorModeChange,
        onToggleChat,
        onToggleOutline,
        onTogglePreview,
        onOpenCheatsheet,
        onOpenPreferences,
        onOpenOnboarding,
        onSaveAsTemplate,
        onUiVariantChange,
      }),
    [
      roomId,
      note,
      viewMode,
      editorMode,
      uiVariant,
      chatOpen,
      outlineOpen,
      onNewRoom,
      onOpenSheetPicker,
      onViewModeChange,
      onEditorModeChange,
      onToggleChat,
      onToggleOutline,
      onTogglePreview,
      onOpenCheatsheet,
      onOpenPreferences,
      onOpenOnboarding,
      onSaveAsTemplate,
      onUiVariantChange,
    ],
  );


  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) =>
      `${c.label} ${c.keywords}`.toLowerCase().includes(q),
    );
  }, [commands, query]);

  // Reset state whenever the palette opens.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    const t = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((i) =>
          filtered.length ? (i + 1) % filtered.length : 0,
        );
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((i) =>
          filtered.length ? (i - 1 + filtered.length) % filtered.length : 0,
        );
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const cmd = filtered[activeIndex];
        if (cmd) runAndClose(cmd.run);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, filtered, activeIndex, runAndClose, onClose]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-palette-index="${activeIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open) return null;


  const palette = (
    <div
      className="vt-overlay fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[max(5vh,var(--header-h))]"
      role="dialog"
      aria-modal="true"
      aria-label={paletteLabel}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="vt-elevated w-full max-w-md overflow-hidden rounded-[var(--radius-sm)] bg-canvas-soft">
        <div className="flex items-center gap-2 border-b border-hairline px-4 py-3">
          <SafeSvg
            width={15}
            height={15}
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
            className="shrink-0 opacity-50"
          >
            <path
              d="M7 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm4 4 3 3"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </SafeSvg>
          <input
            ref={inputRef}
            id={titleId}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command…"
            aria-label={paletteLabel}
            autoComplete="off"
            spellCheck={false}
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-mute"
          />
          <kbd className="vt-caption shrink-0 rounded border border-hairline px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-mute">
            Esc
          </kbd>
        </div>

        <div
          ref={listRef}
          className="max-h-[min(60vh,24rem)] overflow-y-auto p-1.5"
          role="listbox"
          aria-label="Commands"
        >
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-sm text-mute">No matching command.</p>
          ) : (
            filtered.map((cmd, index) => {
              const active = index === activeIndex;
              const prevGroup = filtered[index - 1]?.group;
              const showGroup = cmd.group !== prevGroup;
              return (
                <div key={cmd.id}>
                  {showGroup ? (
                    <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-mute">
                      {cmd.group}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    data-palette-index={index}
                    role="option"
                    aria-selected={active}
                    onPointerMove={() => setActiveIndex(index)}
                    onClick={() => runAndClose(cmd.run)}
                    className={`vt-palette-item flex w-full items-center justify-between gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm ${
                      active ? "bg-ink/10" : ""
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5 text-ink">
                      <CommandGlyph />
                      <span className="truncate">{cmd.label}</span>
                    </span>
                    {cmd.hint ? (
                      <kbd className="vt-caption shrink-0 rounded border border-hairline bg-canvas px-1.5 py-0.5 font-mono text-[10px] text-mute">
                        {cmd.hint}
                      </kbd>
                    ) : null}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(palette, document.body);
}
