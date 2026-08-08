"use client";

import type { SlashCommand } from "@/lib/slash-commands";

type SlashMenuProps = {
  commands: SlashCommand[];
  activeIndex: number;
  onSelect: (command: SlashCommand) => void;
};

export function SlashMenu({
  commands,
  activeIndex,
  onSelect,
}: SlashMenuProps) {
  if (commands.length === 0) return null;

  return (
    <ul
      className="vt-elevated--sm vt-dropdown vt-chat-mention-menu"
      role="listbox"
      aria-label="Slash commands"
    >
      {commands.map((cmd, i) => (
        <li key={cmd.id}>
          <button
            type="button"
            role="option"
            aria-selected={i === activeIndex}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(cmd);
            }}
            className={
              i === activeIndex
                ? "vt-chat-mention-menu__item vt-chat-mention-menu__item--active"
                : "vt-chat-mention-menu__item"
            }
          >
            <span className="font-medium">/{cmd.id}</span>
            <span className="text-xs opacity-60">{cmd.hint}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
