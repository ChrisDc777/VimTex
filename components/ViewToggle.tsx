"use client";

import type { ViewMode } from "@/lib/types";

type ViewToggleProps = {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
};

const OPTIONS: { id: ViewMode; label: string; short: string }[] = [
  { id: "realtime", label: "Realtime", short: "Live" },
  { id: "split", label: "Split", short: "Split" },
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
            aria-label={opt.label}
            onClick={() => onChange(opt.id)}
            className={
              active
                ? "vt-pill vt-pill--solid vt-pill--label"
                : "vt-pill vt-pill--ghost vt-pill--label"
            }
          >
            <span className="sm:hidden">{opt.short}</span>
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
