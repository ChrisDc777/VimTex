"use client";

import type { VimMode } from "@/lib/types";

type StatusBarProps = {
  vimMode: VimMode;
};

function formatMode(mode: VimMode): string {
  const m = mode.toLowerCase();
  if (m.startsWith("vis")) return "VISUAL";
  if (m.startsWith("ins")) return "INSERT";
  if (m.startsWith("rep")) return "REPLACE";
  if (m.startsWith("nor") || m === "normal") return "NORMAL";
  return mode.toUpperCase();
}

export function StatusBar({ vimMode }: StatusBarProps) {
  return (
    <footer className="flex h-9 shrink-0 items-center justify-between gap-4 border-t border-hairline px-4">
      <span className="font-mono text-xs uppercase tracking-[1.2px] text-mute">
        {formatMode(vimMode)}
      </span>
      <span className="font-mono text-xs tracking-[1.2px] text-mute">
        unsaved · clears on refresh
      </span>
    </footer>
  );
}
