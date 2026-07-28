"use client";

import {
  loadUiVariant,
  saveUiVariant,
  UI_VARIANTS,
  uiVariantLabel,
  type UiVariant,
} from "@/lib/ui-variant";

type UiVariantToggleProps = {
  value: UiVariant;
  onChange: (variant: UiVariant) => void;
  className?: string;
};

export function UiVariantToggle({
  value,
  onChange,
  className,
}: UiVariantToggleProps) {
  return (
    <div
      className={className ?? "flex items-center gap-1.5"}
      role="group"
      aria-label="Workspace style"
    >
      {UI_VARIANTS.map((variant) => (
        <button
          key={variant}
          type="button"
          aria-pressed={value === variant}
          title={
            variant === "studio"
              ? "Studio — primary collaborative shell"
              : "Forge — multi-tab workspace shell"
          }
          onClick={() => {
            saveUiVariant(variant);
            onChange(variant);
          }}
          className={
            value === variant
              ? "vt-pill vt-pill--solid vt-pill--label"
              : "vt-pill vt-pill--ghost vt-pill--label"
          }
        >
          {uiVariantLabel(variant)}
        </button>
      ))}
    </div>
  );
}

export { loadUiVariant, saveUiVariant };
