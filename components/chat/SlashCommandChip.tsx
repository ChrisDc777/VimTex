"use client";

import type { SlashCommand } from "@/lib/slash-commands";

type SlashCommandChipProps = {
  command: SlashCommand;
  onClear: () => void;
  /** Position in the chips row — drives alternating accent color. */
  chipIndex?: number;
};

/**
 * Pending slash command attached to the next send (Claude/Cursor-style chip).
 * Even indices use the breeze (blue) accent; odd indices use sunset (orange-red).
 */
export function SlashCommandChip({
  command,
  onClear,
  chipIndex = 0,
}: SlashCommandChipProps) {
  const accent = chipIndex % 2 === 0 ? "breeze" : "sunset";
  return (
    <div
      className={`vt-slash-chip vt-slash-chip--${accent}`}
      title={command.hint}
      aria-label={`Command /${command.id}: ${command.title}`}
    >
      <span className="vt-slash-chip__id">/{command.id}</span>
      <span className="vt-slash-chip__title">{command.title}</span>
      <button
        type="button"
        className="vt-slash-chip__clear"
        onClick={onClear}
        aria-label="Remove command"
        title="Remove"
      >
        ×
      </button>
    </div>
  );
}
