"use client";

type ViewToggleProps = {
  value: "realtime" | "split";
  onChange: (mode: "realtime" | "split") => void;
};

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div
      className="flex items-center gap-1.5"
      role="group"
      aria-label="View mode"
    >
      <button
        type="button"
        aria-pressed={value === "realtime"}
        onClick={() => onChange("realtime")}
        className={
          value === "realtime"
            ? "vt-pill vt-pill--solid"
            : "vt-pill vt-pill--ghost"
        }
      >
        Realtime
      </button>
      <button
        type="button"
        aria-pressed={value === "split"}
        onClick={() => onChange("split")}
        className={
          value === "split" ? "vt-pill vt-pill--solid" : "vt-pill vt-pill--ghost"
        }
      >
        Split
      </button>
    </div>
  );
}
