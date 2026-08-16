"use client";

import {
  STUDIO_COLOR_THEME_META,
  type StudioAppearance,
  type StudioColorThemeId,
} from "@/lib/studio-color-theme";

type ThemePickerProps = {
  theme: StudioColorThemeId;
  appearance: StudioAppearance;
  onThemeChange: (theme: StudioColorThemeId) => void;
  onAppearanceChange: (appearance: StudioAppearance) => void;
};

function MeshSwatch({
  base,
  glow,
  glow2,
  mode,
  selected,
}: {
  base: string;
  glow: string;
  glow2: string;
  mode: StudioAppearance;
  selected: boolean;
}) {
  return (
    <span
      className={
        selected
          ? "relative inline-flex size-11 shrink-0 rounded-full ring-2 ring-[color:var(--focus)] ring-offset-2 ring-offset-[color:var(--canvas-elevated)]"
          : "relative inline-flex size-11 shrink-0 rounded-full"
      }
      style={{
        background: `
          radial-gradient(circle at 72% 28%, ${glow} 0%, transparent 52%),
          radial-gradient(circle at 28% 78%, ${glow2} 0%, transparent 48%),
          ${base}
        `,
        boxShadow: "inset 0 0 0 1px color-mix(in srgb, white 12%, transparent)",
      }}
      aria-hidden
    >
      {selected ? (
        <span className="absolute bottom-0.5 right-0.5 grid size-3.5 place-items-center rounded-full bg-[color:var(--canvas-elevated)] text-[9px] text-ink shadow">
          {mode === "light" ? "☀" : "☾"}
        </span>
      ) : null}
    </span>
  );
}

/**
 * Mesh theme cards — light + dark swatches per palette (T3-style picker).
 */
export function ThemePicker({
  theme,
  appearance,
  onThemeChange,
  onAppearanceChange,
}: ThemePickerProps) {
  return (
    <div className="space-y-3">
      <div
        className="vt-segment"
        role="group"
        aria-label="Appearance"
      >
        {(
          [
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={
              appearance === opt.value
                ? "vt-segment__btn vt-segment__btn--active"
                : "vt-segment__btn"
            }
            aria-pressed={appearance === opt.value}
            onClick={() => onAppearanceChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div
        className="grid grid-cols-1 gap-2 sm:grid-cols-2"
        role="listbox"
        aria-label="Color theme"
      >
        {STUDIO_COLOR_THEME_META.map((meta) => {
          const selected = theme === meta.id;
          const light = meta.light;
          const dark = meta.dark;
          return (
            <button
              key={meta.id}
              type="button"
              role="option"
              aria-selected={selected}
              className={
                selected
                  ? "flex w-full items-center gap-3 rounded-2xl border border-[color:var(--focus)] bg-[color-mix(in_srgb,var(--ink)_4%,transparent)] px-3 py-3 text-left"
                  : "flex w-full items-center gap-3 rounded-2xl border border-hairline bg-[color-mix(in_srgb,var(--ink)_2%,transparent)] px-3 py-3 text-left"
              }
              onClick={() => onThemeChange(meta.id)}
            >
              <span className="flex shrink-0 items-center gap-1.5">
                <MeshSwatch
                  base={light.base}
                  glow={light.glow}
                  glow2={light.glow2}
                  mode="light"
                  selected={selected && appearance === "light"}
                />
                <MeshSwatch
                  base={dark.base}
                  glow={dark.glow}
                  glow2={dark.glow2}
                  mode="dark"
                  selected={selected && appearance === "dark"}
                />
              </span>
              <span className="min-w-0 text-sm font-medium text-ink">
                {meta.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
