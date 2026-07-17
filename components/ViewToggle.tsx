"use client";

import type { ViewMode } from "@/lib/types";

type ViewToggleProps = {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
};

const OPTIONS: { id: ViewMode; label: string }[] = [
  { id: "realtime", label: "Realtime" },
  { id: "split", label: "Split" },
];

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div
      role="group"
      aria-label="View mode"
      className="flex items-center gap-1.5"
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.id)}
            className={
              active
                ? "rounded-full bg-primary px-3 py-1 text-sm text-on-primary transition-colors"
                : "rounded-full border border-hairline bg-canvas px-3 py-1 text-sm text-ink hover:border-body-mid transition-colors"
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
