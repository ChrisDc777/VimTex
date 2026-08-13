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
import { exportAsMd, exportAsPdf, exportAsTex } from "@/lib/export";
import { copyVimtexSourceToClipboard } from "@/lib/copy-note";
import { openNoteImport } from "@/lib/ui-events";
import { uiVariantLabel, type UiVariant } from "@/lib/ui-variant";
import type { EditorMode } from "@/lib/editor-mode";
import type { NewRoomOptions, ViewMode } from "@/lib/types";

type CommandPaletteProps = {
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

type Command = {
  id: string;
  label: string;
  keywords: string;
  hint?: string;
  run: () => void;
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

  const commands = useMemo<Command[]>(() => {
    const list: Command[] = [];
    if (roomId) {
      list.push({
        id: "copy-link",
        label: "Copy room link",
        keywords: "share invite url clipboard",
        hint: "Share",
        run: () => void copyRoomLink(),
      });
    }
    list.push({
      id: "new-sheet",
      label: "New sheet",
      keywords: "new room sheet blank fresh empty",
      hint: "Blank",
      run: () => onNewRoom(),
    });
    list.push({
      id: "new-sheet-template",
      label: "Templates…",
      keywords: "new sheet template picker custom sheet types",
      hint: "Template",
      run: () => onOpenSheetPicker(),
    });
    list.push({
      id: "save-template",
      label: "Save current note as template",
      keywords: "save custom template reuse library",
      hint: "Template",
      run: () => onSaveAsTemplate(),
    });
    list.push(
      {
        id: "import-note",
        label: "Import LaTeX or Markdown",
        keywords: "upload open .tex .md file import",
        hint: "File",
        run: () => openNoteImport(),
      },
      {
        id: "export-tex",
        label: "Export as LaTeX (Overleaf)",
        keywords: "download .tex save overleaf compile pdflatex",
        hint: ".tex",
        run: () => exportAsTex(note),
      },
      {
        id: "export-md",
        label: "Export as Markdown ($ math)",
        keywords: "download .md save obsidian github jupyter",
        hint: ".md",
        run: () => exportAsMd(note),
      },
      {
        id: "export-pdf",
        label: "Export as PDF (print)",
        keywords: "download print save pdf paper",
        hint: "PDF",
        run: () => exportAsPdf(note),
      },
      {
        id: "copy-vimtex-source",
        label: "Copy VimTex source",
        keywords: "copy clipboard verbatim lossless buffer",
        hint: "Copy",
        run: () => copyVimtexSourceToClipboard(note),
      },
    );
    if (viewMode && onViewModeChange) {
      list.push({
        id: "toggle-view",
        label:
          viewMode === "split" ? "Switch to Live view" : "Switch to Split view",
        keywords: "view preview live split render",
        hint: "View",
        run: () =>
          onViewModeChange(viewMode === "split" ? "realtime" : "split"),
      });
    }
    if (onTogglePreview) {
      list.push({
        id: "toggle-preview",
        label: "Toggle preview",
        keywords: "preview render",
        hint: "View",
        run: () => onTogglePreview(),
      });
    }
    const otherMode = editorMode === "vim" ? "standard" : "vim";
    list.push({
      id: "toggle-editor-mode",
      label:
        editorMode === "vim"
          ? "Switch to Standard keys"
          : "Switch to Vim keys",
      keywords: "vim standard editing mode keys",
      hint: "Editor",
      run: () => onEditorModeChange(otherMode),
    });
    list.push({
      id: "toggle-chat",
      label: chatOpen ? "Close room chat" : "Open room chat",
      keywords: "chat panel messages",
      hint: "Chat",
      run: () => onToggleChat(),
    });
    if (onToggleOutline) {
      list.push({
        id: "toggle-outline",
        label: outlineOpen ? "Close document outline" : "Open document outline",
        keywords: "outline sections todo headings structure",
        hint: "Outline",
        run: () => onToggleOutline(),
      });
    }
    list.push({
      id: "cheatsheet",
      label: "Open shortcuts & tips",
      keywords: "help shortcuts tips vim keys reference",
      hint: "Help",
      run: () => onOpenCheatsheet(),
    });
    list.push({
      id: "preferences",
      label: "Open preferences",
      keywords: "settings preferences editor keys workspace style",
      hint: "Editor",
      run: () => onOpenPreferences(),
    });
    list.push({
      id: "onboarding",
      label: "Show welcome intro",
      keywords: "welcome onboarding intro get started help",
      hint: "Help",
      run: () => onOpenOnboarding(),
    });
    const otherVariant = uiVariant === "studio" ? "forge" : "studio";
    list.push({
      id: "switch-shell",
      label: `Switch to ${uiVariantLabel(otherVariant)} shell`,
      keywords: "shell ui theme forge studio variant",
      hint: "Shell",
      run: () => onUiVariantChange(otherVariant),
    });
    return list;
  }, [
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
  ]);


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
          <kbd className="vt-caption shrink-0 text-mute">Esc</kbd>
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
              return (
                <button
                  key={cmd.id}
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
                    <span className="vt-caption shrink-0 text-mute">
                      {cmd.hint}
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(palette, document.body);
}

async function copyRoomLink(): Promise<void> {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  try {
    await navigator.clipboard.writeText(url.toString());
  } catch {
    try {
      window.prompt("Copy this room link:", url.toString());
    } catch {
      // ignore
    }
  }
}
