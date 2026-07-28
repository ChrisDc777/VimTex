"use client";

type MentionMenuProps = {
  suggestions: string[];
  activeIndex: number;
  onSelect: (tag: string) => void;
};

export function MentionMenu({
  suggestions,
  activeIndex,
  onSelect,
}: MentionMenuProps) {
  if (suggestions.length === 0) return null;

  return (
    <ul
      className="vt-elevated--sm vt-dropdown vt-chat-mention-menu"
      role="listbox"
    >
      {suggestions.map((tag, i) => (
        <li key={tag}>
          <button
            type="button"
            role="option"
            aria-selected={i === activeIndex}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(tag);
            }}
            className={
              i === activeIndex
                ? "vt-chat-mention-menu__item vt-chat-mention-menu__item--active"
                : "vt-chat-mention-menu__item"
            }
          >
            <span className="font-medium">@{tag}</span>
            <span className="text-xs opacity-60">Ask the model</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
