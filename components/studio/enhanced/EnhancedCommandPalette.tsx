"use client";

import { useCallback, useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BookmarkPlus,
  Columns2,
  Copy,
  Eye,
  FileCode,
  FileDown,
  FilePlus,
  FileText,
  FileUp,
  HelpCircle,
  Keyboard,
  LayoutTemplate,
  Link,
  ListTree,
  MessageSquare,
  PanelsTopLeft,
  Settings,
  Sparkles,
} from "lucide-react";
import {
  CommandPalette as BeuiCommandPalette,
  type CommandItem,
} from "@/components/beui/motion/command-palette";
import type { CommandPaletteProps } from "@/components/CommandPalette";
import {
  buildVimTexCommands,
  type VimTexCommandIcon,
} from "@/lib/command-catalog";

const COMMAND_ICONS: Record<VimTexCommandIcon, LucideIcon> = {
  link: Link,
  "file-plus": FilePlus,
  "layout-template": LayoutTemplate,
  "bookmark-plus": BookmarkPlus,
  "file-up": FileUp,
  "file-code": FileCode,
  "file-text": FileText,
  "file-down": FileDown,
  copy: Copy,
  columns: Columns2,
  eye: Eye,
  keyboard: Keyboard,
  "message-square": MessageSquare,
  "list-tree": ListTree,
  "help-circle": HelpCircle,
  settings: Settings,
  sparkles: Sparkles,
  panels: PanelsTopLeft,
};

export function EnhancedCommandPalette({
  open,
  onClose,
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
}: CommandPaletteProps) {
  const runAndClose = useCallback(
    (run: () => void) => {
      run();
      onClose();
    },
    [onClose],
  );

  const items = useMemo<CommandItem[]>(() => {
    return buildVimTexCommands({
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
    }).map((cmd) => ({
      id: cmd.id,
      label: cmd.label,
      group: cmd.group,
      hint: cmd.hint,
      icon: COMMAND_ICONS[cmd.icon],
      keywords: cmd.keywords.split(/\s+/).filter(Boolean),
      onSelect: () => runAndClose(cmd.run),
    }));
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
    runAndClose,
  ]);

  return (
    <BeuiCommandPalette
      items={items}
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      shortcut=""
      placeholder="Type a command…"
      emptyMessage="No matching command."
    />
  );
}
