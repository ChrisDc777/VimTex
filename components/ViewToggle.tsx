"use client";

type ViewToggleProps = {
  value: "realtime" | "split";
  onChange: (mode: "realtime" | "split") => void;
};

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  const isLive = value === "realtime";

  return (
    <div className="vt-segment" role="group" aria-label="View mode">
      <button
        type="button"
        aria-pressed={isLive}
        onClick={() => onChange("realtime")}
        className={
          isLive
            ? "vt-segment__btn vt-segment__btn--active"
            : "vt-segment__btn"
        }
      >
        Live
      </button>
      <button
        type="button"
        className="vt-segment__divider"
        aria-label={isLive ? "Switch to split view" : "Switch to live view"}
        onClick={() => onChange(isLive ? "split" : "realtime")}
      />
      <button
        type="button"
        aria-pressed={!isLive}
        onClick={() => onChange("split")}
        className={
          !isLive
            ? "vt-segment__btn vt-segment__btn--active"
            : "vt-segment__btn"
        }
      >
        Split
      </button>
    </div>
  );
}
