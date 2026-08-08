"use client";

import type { SlashCommand } from "@/lib/slash-commands";

type SlashCommandChipProps = {
  command: SlashCommand;
  onClear: () => void;
};

/**
 * Pending slash command attached to the next send (Claude/Cursor-style chip).
 */
export function SlashCommandChip({ command, onClear }: SlashCommandChipProps) {
  return (
    <div
      className="vt-chat-context-chip"
      title={command.hint}
      aria-label={`Command /${command.id}: ${command.title}`}
    >
      <span className="vt-chat-context-chip__label">/{command.id}</span>
      <span className="vt-chat-context-chip__preview">{command.title}</span>
      <button
        type="button"
        className="vt-chat-context-chip__clear"
        onClick={onClear}
        aria-label="Clear command"
        title="Clear"
      >
        ×
      </button>
    </div>
  );
}
