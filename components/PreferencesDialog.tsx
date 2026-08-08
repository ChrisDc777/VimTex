"use client";

import { useEffect, useId } from "react";
import { saveEditorMode, type EditorMode } from "@/lib/editor-mode";
import {
  saveUiVariant,
  UI_VARIANTS,
  uiVariantLabel,
  type UiVariant,
} from "@/lib/ui-variant";
import type { AiApplyMode } from "@/lib/ai-review-prefs";
import { useAiReviewOptional } from "@/components/ai/AiReviewProvider";
import { useAiChromePrefs } from "@/lib/use-ai-chrome-prefs";

type PreferencesDialogProps = {
  open: boolean;
  onClose: () => void;
  editorMode: EditorMode;
  onEditorModeChange: (mode: EditorMode) => void;
  relativeLineNumbers: boolean;
  onRelativeLineNumbersChange: (enabled: boolean) => void;
  uiVariant: UiVariant;
  onUiVariantChange: (variant: UiVariant) => void;
  /** Show AI review prefs (Studio). Forge stays suggest-only. */
  showAiReviewPrefs?: boolean;
};

function Segment<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="vt-segment" role="group" aria-label={label}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={
            value === opt.value
              ? "vt-segment__btn vt-segment__btn--active"
              : "vt-segment__btn"
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function PreferencesDialog({
  open,
  onClose,
  editorMode,
  onEditorModeChange,
  relativeLineNumbers,
  onRelativeLineNumbersChange,
  uiVariant,
  onUiVariantChange,
  showAiReviewPrefs = false,
}: PreferencesDialogProps) {
  const titleId = useId();
  const review = useAiReviewOptional();
  const chrome = useAiChromePrefs();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const applyEditorMode = (mode: EditorMode) => {
    saveEditorMode(mode);
    onEditorModeChange(mode);
  };

  const applyUiVariant = (variant: UiVariant) => {
    saveUiVariant(variant);
    onUiVariantChange(variant);
  };

  const aiSection =
    showAiReviewPrefs && review ? (
      <>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">AI apply</p>
            <p className="mt-0.5 text-xs text-mute">
              Confirm each edit, or auto-apply with Undo
            </p>
          </div>
          <Segment
            label="AI apply"
            options={[
              { value: "confirm", label: "Confirm" },
              { value: "auto", label: "Auto" },
            ]}
            value={review.prefs.applyMode}
            onChange={(value) => review.setApplyMode(value as AiApplyMode)}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">AI in preview</p>
            <p className="mt-0.5 text-xs text-mute">
              Show Before/After in Split preview while reviewing
            </p>
          </div>
          <Segment
            label="AI in preview"
            options={[
              { value: "on", label: "On" },
              { value: "off", label: "Off" },
            ]}
            value={review.prefs.showInPreview ? "on" : "off"}
            onChange={(value) => review.setShowInPreview(value === "on")}
          />
        </div>
      </>
    ) : null;

  return (
    <div
      className="vt-overlay fixed inset-0 z-50 flex items-end justify-center bg-canvas/80 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="vt-dialog vt-elevated w-full max-w-md rounded-[var(--radius-sm)] p-6"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <p id={titleId} className="vt-caption text-ink">
          Preferences
        </p>

        <div className="mt-5 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">Editor keys</p>
              <p className="mt-0.5 text-xs text-mute">
                Vim motions or plain editing
              </p>
            </div>
            <Segment
              label="Editor keys"
              options={[
                { value: "vim", label: "Vim" },
                { value: "standard", label: "Standard" },
              ]}
              value={editorMode}
              onChange={applyEditorMode}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">
                Relative line numbers
              </p>
              <p className="mt-0.5 text-xs text-mute">
                Show distance from the cursor
              </p>
            </div>
            <Segment
              label="Relative line numbers"
              options={[
                { value: "on", label: "On" },
                { value: "off", label: "Off" },
              ]}
              value={relativeLineNumbers ? "on" : "off"}
              onChange={(value) => onRelativeLineNumbersChange(value === "on")}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">Workspace style</p>
              <p className="mt-0.5 text-xs text-mute">
                Studio or Forge shell
              </p>
            </div>
            <Segment
              label="Workspace style"
              options={UI_VARIANTS.map((variant) => ({
                value: variant,
                label: uiVariantLabel(variant),
              }))}
              value={uiVariant}
              onChange={applyUiVariant}
            />
          </div>

          {aiSection}

          {showAiReviewPrefs ? (
            <>
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">Slash menu</p>
                  <p className="mt-0.5 text-xs text-mute">
                    Type / in chat, add context, Enter to run
                  </p>
                </div>
                <Segment
                  label="Slash menu"
                  options={[
                    { value: "on", label: "On" },
                    { value: "off", label: "Off" },
                  ]}
                  value={chrome.prefs.slashMenu ? "on" : "off"}
                  onChange={(value) =>
                    chrome.setPref("slashMenu", value === "on")
                  }
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">
                    Document action pills
                  </p>
                  <p className="mt-0.5 text-xs text-mute">
                    Fix errors / abstract shortcuts above chat
                  </p>
                </div>
                <Segment
                  label="Document action pills"
                  options={[
                    { value: "on", label: "On" },
                    { value: "off", label: "Off" },
                  ]}
                  value={chrome.prefs.docActionPills ? "on" : "off"}
                  onChange={(value) =>
                    chrome.setPref("docActionPills", value === "on")
                  }
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">Ghost text</p>
                  <p className="mt-0.5 text-xs text-mute">
                    Suggest \end and math closers while typing
                  </p>
                </div>
                <Segment
                  label="Ghost text"
                  options={[
                    { value: "on", label: "On" },
                    { value: "off", label: "Off" },
                  ]}
                  value={chrome.prefs.ghostText ? "on" : "off"}
                  onChange={(value) =>
                    chrome.setPref("ghostText", value === "on")
                  }
                />
              </div>
            </>
          ) : null}
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={onClose}
            className="vt-pill vt-pill--solid vt-pill--label min-w-[7.5rem]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
