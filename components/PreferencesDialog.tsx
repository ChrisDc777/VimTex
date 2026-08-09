"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
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

type PrefSection = "editor" | "workspace" | "ai";

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

function PrefRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="mt-0.5 text-xs text-mute">{description}</p>
      </div>
      {children}
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
  const [section, setSection] = useState<PrefSection>("editor");

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

  useEffect(() => {
    if (!open) return;
    if (section === "ai" && !showAiReviewPrefs) setSection("editor");
  }, [open, section, showAiReviewPrefs]);

  if (!open) return null;

  const applyEditorMode = (mode: EditorMode) => {
    saveEditorMode(mode);
    onEditorModeChange(mode);
  };

  const applyUiVariant = (variant: UiVariant) => {
    saveUiVariant(variant);
    onUiVariantChange(variant);
  };

  const sections: { id: PrefSection; label: string }[] = showAiReviewPrefs
    ? [
        { id: "editor", label: "Editor" },
        { id: "workspace", label: "Workspace" },
        { id: "ai", label: "AI" },
      ]
    : [
        { id: "editor", label: "Editor" },
        { id: "workspace", label: "Workspace" },
      ];

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
        className="vt-dialog vt-elevated vt-prefs-dialog w-full max-w-lg rounded-[var(--radius-sm)]"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="vt-prefs-dialog__header">
          <p id={titleId} className="vt-caption text-ink">
            Preferences
          </p>
          <div className="vt-segment vt-prefs-dialog__nav" role="tablist" aria-label="Preference sections">
            {sections.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={section === s.id}
                onClick={() => setSection(s.id)}
                className={
                  section === s.id
                    ? "vt-segment__btn vt-segment__btn--active"
                    : "vt-segment__btn"
                }
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="vt-prefs-dialog__body" role="tabpanel">
          {section === "editor" ? (
            <div className="space-y-5">
              <PrefRow
                title="Editor keys"
                description="Vim motions or plain editing"
              >
                <Segment
                  label="Editor keys"
                  options={[
                    { value: "vim", label: "Vim" },
                    { value: "standard", label: "Standard" },
                  ]}
                  value={editorMode}
                  onChange={applyEditorMode}
                />
              </PrefRow>

              <PrefRow
                title="Relative line numbers"
                description="Show distance from the cursor"
              >
                <Segment
                  label="Relative line numbers"
                  options={[
                    { value: "on", label: "On" },
                    { value: "off", label: "Off" },
                  ]}
                  value={relativeLineNumbers ? "on" : "off"}
                  onChange={(value) =>
                    onRelativeLineNumbersChange(value === "on")
                  }
                />
              </PrefRow>
            </div>
          ) : null}

          {section === "workspace" ? (
            <div className="space-y-5">
              <PrefRow
                title="Workspace style"
                description="Studio or Forge shell"
              >
                <Segment
                  label="Workspace style"
                  options={UI_VARIANTS.map((variant) => ({
                    value: variant,
                    label: uiVariantLabel(variant),
                  }))}
                  value={uiVariant}
                  onChange={applyUiVariant}
                />
              </PrefRow>
            </div>
          ) : null}

          {section === "ai" && showAiReviewPrefs ? (
            <div className="space-y-5">
              {review ? (
                <>
                  <PrefRow
                    title="AI apply"
                    description="Confirm each edit, or auto-apply with Undo"
                  >
                    <Segment
                      label="AI apply"
                      options={[
                        { value: "confirm", label: "Confirm" },
                        { value: "auto", label: "Auto" },
                      ]}
                      value={review.prefs.applyMode}
                      onChange={(value) =>
                        review.setApplyMode(value as AiApplyMode)
                      }
                    />
                  </PrefRow>

                  <PrefRow
                    title="AI in preview"
                    description="Show Before/After in Split preview while reviewing"
                  >
                    <Segment
                      label="AI in preview"
                      options={[
                        { value: "on", label: "On" },
                        { value: "off", label: "Off" },
                      ]}
                      value={review.prefs.showInPreview ? "on" : "off"}
                      onChange={(value) =>
                        review.setShowInPreview(value === "on")
                      }
                    />
                  </PrefRow>

                  <PrefRow
                    title="Snapshot on Accept"
                    description="Before applying a confirmed AI edit, save a Version history checkpoint. Restoring a checkpoint replaces the shared note for everyone in the room."
                  >
                    <Segment
                      label="Snapshot on Accept"
                      options={[
                        { value: "on", label: "On" },
                        { value: "off", label: "Off" },
                      ]}
                      value={review.prefs.snapshotOnAccept ? "on" : "off"}
                      onChange={(value) =>
                        review.setSnapshotOnAccept(value === "on")
                      }
                    />
                  </PrefRow>
                </>
              ) : null}

              <PrefRow
                title="Slash menu"
                description="Type / in chat, then Enter to run"
              >
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
              </PrefRow>

              <PrefRow
                title="Document action pills"
                description="Fix errors / abstract shortcuts above chat"
              >
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
              </PrefRow>

              <PrefRow
                title="Ghost text"
                description="Suggest \end and math closers while typing"
              >
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
              </PrefRow>
            </div>
          ) : null}
        </div>

        <div className="vt-prefs-dialog__footer">
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
