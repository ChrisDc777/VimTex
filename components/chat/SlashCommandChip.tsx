"use client";

import type { SlashCommand } from "@/lib/slash-commands";

type SlashCommandChipProps = {
  command: SlashCommand;
  onClear: () => void;
};

/**
 * Cursor-style inline slash token: just `/id` in the composer, removable.
 * Color is a breeze→sunset gradient blend, same for every command.
 */
export function SlashCommandChip({ command, onClear }: SlashCommandChipProps) {
  return (
    <button
      type="button"
      className="vt-slash-token"
      title={`${command.title} — ${command.hint} (click or Backspace to remove)`}
      aria-label={`Remove /${command.id}`}
      onClick={onClear}
    >
      /{command.id}
    </button>
  );
}
