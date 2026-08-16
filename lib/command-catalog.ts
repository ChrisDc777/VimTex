import { exportAsMd, exportAsPdf, exportAsTex } from "./export";
import { copyVimtexSourceToClipboard } from "./copy-note";
import { openNoteImport } from "./ui-events";
import { uiVariantLabel, type UiVariant } from "./ui-variant";
import type { EditorMode } from "./editor-mode";
import type { NewRoomOptions, ViewMode } from "./types";

export type VimTexCommandGroup = "Room" | "Note" | "View" | "Settings" | "Help";

export type VimTexCommandIcon =
  | "link"
  | "file-plus"
  | "layout-template"
  | "bookmark-plus"
  | "file-up"
  | "file-code"
  | "file-text"
  | "file-down"
  | "copy"
  | "columns"
  | "eye"
  | "keyboard"
  | "message-square"
  | "list-tree"
  | "help-circle"
  | "settings"
  | "sparkles"
  | "panels";

export type VimTexCommand = {
  id: string;
  label: string;
  keywords: string;
  hint?: string;
  group: VimTexCommandGroup;
  icon: VimTexCommandIcon;
  run: () => void;
};

export type CommandCatalogInput = {
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
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  onTogglePreview?: () => void;
  outlineOpen?: boolean;
  onToggleOutline?: () => void;
};

export async function copyRoomLink(): Promise<void> {
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

export function buildVimTexCommands(input: CommandCatalogInput): VimTexCommand[] {
  const {
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
  } = input;

  const list: VimTexCommand[] = [];
  if (roomId) {
    list.push({
      id: "copy-link",
      label: "Copy room link",
      keywords: "share invite url clipboard",
      hint: "Share",
      group: "Room",
      icon: "link",
      run: () => void copyRoomLink(),
    });
  }
  list.push({
    id: "new-sheet",
    label: "New sheet",
    keywords: "new room sheet blank fresh empty",
    hint: "Blank",
    group: "Room",
    icon: "file-plus",
    run: () => onNewRoom(),
  });
  list.push({
    id: "new-sheet-template",
    label: "Templates…",
    keywords: "new sheet template picker custom sheet types",
    hint: "Template",
    group: "Room",
    icon: "layout-template",
    run: () => onOpenSheetPicker(),
  });
  list.push({
    id: "save-template",
    label: "Save current note as template",
    keywords: "save custom template reuse library",
    hint: "Template",
    group: "Note",
    icon: "bookmark-plus",
    run: () => onSaveAsTemplate(),
  });
  list.push(
    {
      id: "import-note",
      label: "Import LaTeX or Markdown",
      keywords: "upload open .tex .md file import",
      hint: "File",
      group: "Note",
      icon: "file-up",
      run: () => openNoteImport(),
    },
    {
      id: "export-tex",
      label: "Export as LaTeX (Overleaf)",
      keywords: "download .tex save overleaf compile pdflatex",
      hint: ".tex",
      group: "Note",
      icon: "file-code",
      run: () => exportAsTex(note),
    },
    {
      id: "export-md",
      label: "Export as Markdown ($ math)",
      keywords: "download .md save obsidian github jupyter",
      hint: ".md",
      group: "Note",
      icon: "file-text",
      run: () => exportAsMd(note),
    },
    {
      id: "export-pdf",
      label: "Export as PDF (print)",
      keywords: "download print save pdf paper",
      hint: "PDF",
      group: "Note",
      icon: "file-down",
      run: () => exportAsPdf(note),
    },
    {
      id: "copy-vimtex-source",
      label: "Copy VimTex source",
      keywords: "copy clipboard verbatim lossless buffer",
      hint: "Copy",
      group: "Note",
      icon: "copy",
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
      group: "View",
      icon: "columns",
      run: () => onViewModeChange(viewMode === "split" ? "realtime" : "split"),
    });
  }
  if (onTogglePreview) {
    list.push({
      id: "toggle-preview",
      label: "Toggle preview",
      keywords: "preview render",
      hint: "View",
      group: "View",
      icon: "eye",
      run: () => onTogglePreview(),
    });
  }
  const otherMode = editorMode === "vim" ? "standard" : "vim";
  list.push({
    id: "toggle-editor-mode",
    label:
      editorMode === "vim" ? "Switch to Standard keys" : "Switch to Vim keys",
    keywords: "vim standard editing mode keys",
    hint: "Editor",
    group: "View",
    icon: "keyboard",
    run: () => onEditorModeChange(otherMode),
  });
  list.push({
    id: "toggle-chat",
    label: chatOpen ? "Close room chat" : "Open room chat",
    keywords: "chat panel messages",
    hint: "Chat",
    group: "View",
    icon: "message-square",
    run: () => onToggleChat(),
  });
  if (onToggleOutline) {
    list.push({
      id: "toggle-outline",
      label: outlineOpen ? "Close document outline" : "Open document outline",
      keywords: "outline sections todo headings structure",
      hint: "Outline",
      group: "View",
      icon: "list-tree",
      run: () => onToggleOutline(),
    });
  }
  list.push({
    id: "cheatsheet",
    label: "Open shortcuts & tips",
    keywords: "help shortcuts tips vim keys reference",
    hint: "Help",
    group: "Help",
    icon: "help-circle",
    run: () => onOpenCheatsheet(),
  });
  list.push({
    id: "preferences",
    label: "Open preferences",
    keywords: "settings preferences editor keys workspace style",
    hint: "Editor",
    group: "Settings",
    icon: "settings",
    run: () => onOpenPreferences(),
  });
  list.push({
    id: "onboarding",
    label: "Show welcome intro",
    keywords: "welcome onboarding intro get started help",
    hint: "Help",
    group: "Help",
    icon: "sparkles",
    run: () => onOpenOnboarding(),
  });
  const otherVariant = uiVariant === "studio" ? "forge" : "studio";
  list.push({
    id: "switch-shell",
    label: `Switch to ${uiVariantLabel(otherVariant)} shell`,
    keywords: "shell ui theme forge studio variant",
    hint: "Shell",
    group: "Settings",
    icon: "panels",
    run: () => onUiVariantChange(otherVariant),
  });
  return list;
}
