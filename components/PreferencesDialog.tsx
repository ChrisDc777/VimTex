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
import {
  AI_ROOM_PREFS_EVENT,
  AI_TEMPERATURE_PRESETS,
  DEFAULT_AI_TEMPERATURE,
  loadAiRoomPrefs,
  nearestAiTemperaturePreset,
  saveAiRoomPrefs,
  type AiTemperaturePreset,
} from "@/lib/ai-room-prefs";
import { useAiReviewOptional } from "@/components/ai/AiReviewProvider";
import { useAiChromePrefs } from "@/lib/use-ai-chrome-prefs";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import {
  normalizeCustomSlashId,
  SLASH_COMMANDS,
  type CustomSlashCommand,
} from "@/lib/slash-commands";
import type { BuiltinSlashCommandId } from "@/lib/slash-commands";
import type { SlashTokenStyle } from "@/lib/ai-chrome-prefs";
import {
  DEFAULT_HISTORY_PREFS,
  HISTORY_INTERVAL_MINUTES,
  HISTORY_PREFS_EVENT,
  loadHistoryPrefs,
  saveHistoryPref,
  saveHistoryPrefs,
  type HistoryIntervalMinutes,
  type HistoryPrefs,
} from "@/lib/history-prefs";
import {
  STUDIO_EXPERIENCES,
  studioExperienceLabel,
} from "@/lib/studio-experience-prefs";
import { useStudioExperience } from "@/lib/use-studio-experience";

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
  /** Dialog overlay (default) or inner panel for BEUI drawer. */
  surface?: "dialog" | "panel";
  /** Studio-only: Enhanced | Basic experience toggle. */
  showStudioExperience?: boolean;
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
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="mt-0.5 text-xs text-mute">{description}</p>
      </div>
      <div className="shrink-0 self-end sm:self-auto">{children}</div>
    </div>
  );
}

function CustomSlashForm({
  onSave,
}: {
  onSave: (cmd: CustomSlashCommand) => boolean;
}) {
  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [instruction, setInstruction] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const normalized = normalizeCustomSlashId(id);
    if (!normalized) {
      setError("Use a free id like outline (a–z, digits, -)");
      return;
    }
    if (!instruction.trim()) {
      setError("Instruction is required");
      return;
    }
    const ok = onSave({
      id: normalized,
      title: title.trim() || normalized,
      hint: "Custom command",
      instruction: instruction.trim(),
    });
    if (!ok) {
      setError("Could not save — check the id");
      return;
    }
    setId("");
    setTitle("");
    setInstruction("");
    setError(null);
  };

  return (
    <div className="vt-prefs-custom-slash-form">
      <div className="vt-prefs-custom-slash-fields">
        <input
          type="text"
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="/id"
          spellCheck={false}
          autoComplete="off"
          className="vt-prefs-custom-slash-input"
          aria-label="Custom slash id"
        />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="vt-prefs-custom-slash-input"
          aria-label="Custom slash title"
        />
      </div>
      <textarea
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        placeholder="Instruction sent to Vimothy…"
        rows={2}
        className="vt-prefs-custom-slash-textarea"
        aria-label="Custom slash instruction"
      />
      {error ? <p className="vt-prefs-custom-slash-error">{error}</p> : null}
      <button
        type="button"
        className="vt-prefs-custom-slash-add"
        onClick={submit}
      >
        Add custom /
      </button>
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
  surface = "dialog",
  showStudioExperience = false,
}: PreferencesDialogProps) {
  const titleId = useId();
  const review = useAiReviewOptional();
  const chrome = useAiChromePrefs();
  const workspace = useWorkspace();
  const { experience, setExperience } = useStudioExperience();
  const roomId = workspace?.roomId ?? null;
  const [section, setSection] = useState<PrefSection>("editor");
  const [temperature, setTemperature] = useState<AiTemperaturePreset>(
    DEFAULT_AI_TEMPERATURE as AiTemperaturePreset,
  );
  const [historyPrefs, setHistoryPrefs] = useState<HistoryPrefs>(
    DEFAULT_HISTORY_PREFS,
  );

  useEffect(() => {
    if (!open) return;
    setHistoryPrefs(loadHistoryPrefs());
  }, [open]);

  useEffect(() => {
    const onPrefs = () => setHistoryPrefs(loadHistoryPrefs());
    window.addEventListener(HISTORY_PREFS_EVENT, onPrefs);
    return () => window.removeEventListener(HISTORY_PREFS_EVENT, onPrefs);
  }, []);

  useEffect(() => {
    if (!open || !roomId) return;
    const prefs = loadAiRoomPrefs(roomId);
    setTemperature(
      nearestAiTemperaturePreset(prefs.temperature ?? DEFAULT_AI_TEMPERATURE),
    );
  }, [open, roomId]);

  useEffect(() => {
    if (!roomId) return;
    const onPrefs = (event: Event) => {
      const detail = (event as CustomEvent<{ roomId?: string }>).detail;
      if (detail?.roomId && detail.roomId !== roomId) return;
      const prefs = loadAiRoomPrefs(roomId);
      setTemperature(
        nearestAiTemperaturePreset(prefs.temperature ?? DEFAULT_AI_TEMPERATURE),
      );
    };
    window.addEventListener(AI_ROOM_PREFS_EVENT, onPrefs);
    return () => window.removeEventListener(AI_ROOM_PREFS_EVENT, onPrefs);
  }, [roomId]);

  const applyTemperature = (value: AiTemperaturePreset) => {
    setTemperature(value);
    if (roomId) saveAiRoomPrefs(roomId, { temperature: value });
  };

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

  if (!open) return null;

  const panel = (
    <div
      className={
        surface === "panel"
          ? "vt-prefs-dialog vt-prefs-dialog--panel flex h-full min-h-0 flex-col"
          : "vt-dialog vt-elevated vt-prefs-dialog w-full max-w-lg rounded-[var(--radius-sm)]"
      }
      onPointerDown={surface === "panel" ? undefined : (e) => e.stopPropagation()}
    >
      <div className="vt-prefs-dialog__header">
        <p id={titleId} className="vt-caption text-ink">
          Preferences
        </p>
        <div
          className="vt-segment vt-prefs-dialog__nav"
          role="tablist"
          aria-label="Preference sections"
        >
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

      <div
        className={
          surface === "panel"
            ? "vt-prefs-dialog__body min-h-0 flex-1 overflow-y-auto"
            : "vt-prefs-dialog__body"
        }
        role="tabpanel"
      >
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

              {showStudioExperience ? (
                <PrefRow
                  title="Studio experience"
                  description="Basic keeps the simple, pre-BEUI interface"
                >
                  <Segment
                    label="Studio experience"
                    options={STUDIO_EXPERIENCES.map((value) => ({
                      value,
                      label: studioExperienceLabel(value),
                    }))}
                    value={experience}
                    onChange={setExperience}
                  />
                </PrefRow>
              ) : null}

              <PrefRow
                title="Version checkpoints"
                description="Automatic saves versions after idle edits. Manual only saves when you name a version. Live editing always syncs."
              >
                <Segment
                  label="Version checkpoints"
                  options={[
                    { value: "automatic", label: "Automatic" },
                    { value: "manual", label: "Manual" },
                  ]}
                  value={historyPrefs.checkpointMode}
                  onChange={(value) => {
                    saveHistoryPref(
                      "checkpointMode",
                      value as "automatic" | "manual",
                    );
                    setHistoryPrefs(loadHistoryPrefs());
                  }}
                />
              </PrefRow>

              {historyPrefs.checkpointMode === "automatic" ? (
                <>
                  <PrefRow
                    title="Idle autosnapshot"
                    description="Save a checkpoint after 45s without local edits"
                  >
                    <Segment
                      label="Idle autosnapshot"
                      options={[
                        { value: "on", label: "On" },
                        { value: "off", label: "Off" },
                      ]}
                      value={historyPrefs.idleAutosnap ? "on" : "off"}
                      onChange={(value) => {
                        saveHistoryPref("idleAutosnap", value === "on");
                        setHistoryPrefs(loadHistoryPrefs());
                      }}
                    />
                  </PrefRow>

                  <PrefRow
                    title="Interval autosnapshot"
                    description="Also checkpoint on a timer while the room is open"
                  >
                    <Segment
                      label="Interval autosnapshot"
                      options={[
                        { value: "off", label: "Off" },
                        ...HISTORY_INTERVAL_MINUTES.map((minutes) => ({
                          value: String(minutes),
                          label: `${minutes}m`,
                        })),
                      ]}
                      value={
                        historyPrefs.intervalAutosnap
                          ? String(historyPrefs.intervalMinutes)
                          : "off"
                      }
                      onChange={(value) => {
                        if (value === "off") {
                          saveHistoryPref("intervalAutosnap", false);
                        } else {
                          saveHistoryPrefs({
                            ...loadHistoryPrefs(),
                            intervalAutosnap: true,
                            intervalMinutes: Number(
                              value,
                            ) as HistoryIntervalMinutes,
                          });
                        }
                        setHistoryPrefs(loadHistoryPrefs());
                      }}
                    />
                  </PrefRow>
                </>
              ) : (
                <p className="text-[11px] leading-relaxed text-[var(--mute)]">
                  Live editing still syncs with the room. Versions are only
                  saved when you name them in History.
                </p>
              )}
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
                    description="On Confirm Accept, save a Version history checkpoint first. Restore only from Version history (room-wide)."
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

              {roomId ? (
                <PrefRow
                  title="Creativity"
                  description="Per-room sampling for Vimothy replies"
                >
                  <Segment
                    label="Creativity"
                    options={AI_TEMPERATURE_PRESETS.map((p) => ({
                      value: String(p.value),
                      label: p.label,
                    }))}
                    value={String(temperature)}
                    onChange={(value) =>
                      applyTemperature(Number(value) as AiTemperaturePreset)
                    }
                  />
                </PrefRow>
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

              {chrome.prefs.slashMenu ? (
                <>
                  <PrefRow
                    title="/ token color"
                    description="Inline slash command tint in the composer"
                  >
                    <Segment
                      label="Slash token color"
                      options={[
                        { value: "gradient", label: "Gradient" },
                        { value: "simple", label: "Simple" },
                      ]}
                      value={chrome.prefs.slashTokenStyle}
                      onChange={(value) =>
                        chrome.setPref(
                          "slashTokenStyle",
                          value as SlashTokenStyle,
                        )
                      }
                    />
                  </PrefRow>

                  <div className="flex flex-col gap-2">
                    <div>
                      <p className="text-sm font-medium text-ink">
                        Slash commands
                      </p>
                      <p className="mt-0.5 text-xs text-mute">
                        Core stay on by default. Extras were trimmed earlier —
                        turn them back on here.
                      </p>
                    </div>
                    <div className="vt-prefs-slash-grid">
                      {SLASH_COMMANDS.map((cmd) => {
                        const on = chrome.prefs.enabledSlashCommands.includes(
                          cmd.id as BuiltinSlashCommandId,
                        );
                        return (
                          <label
                            key={cmd.id}
                            className={
                              on
                                ? "vt-prefs-slash-chip vt-prefs-slash-chip--on"
                                : "vt-prefs-slash-chip"
                            }
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={on}
                              onChange={(e) =>
                                chrome.setSlashCommandEnabled(
                                  cmd.id as BuiltinSlashCommandId,
                                  e.target.checked,
                                )
                              }
                            />
                            <span className="vt-prefs-slash-chip__id">
                              /{cmd.id}
                            </span>
                            {cmd.optional ? (
                              <span className="vt-prefs-slash-chip__extra">
                                extra
                              </span>
                            ) : null}
                          </label>
                        );
                      })}
                    </div>

                    <div className="mt-1 flex flex-col gap-2">
                      <p className="text-xs text-mute">
                        Custom commands — saved in this browser
                      </p>
                      {chrome.prefs.customSlashCommands.length > 0 ? (
                        <ul className="vt-prefs-custom-slash-list">
                          {chrome.prefs.customSlashCommands.map((c) => (
                            <li key={c.id} className="vt-prefs-custom-slash-row">
                              <span className="vt-prefs-slash-chip__id">
                                /{c.id}
                              </span>
                              <span className="vt-prefs-custom-slash-title">
                                {c.title}
                              </span>
                              <button
                                type="button"
                                className="vt-prefs-custom-slash-remove"
                                onClick={() => chrome.deleteCustomSlash(c.id)}
                              >
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <CustomSlashForm
                        onSave={(cmd) => chrome.upsertCustomSlash(cmd)}
                      />
                    </div>
                  </div>
                </>
              ) : null}

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
  );

  if (surface === "panel") {
    return panel;
  }

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
      {panel}
    </div>
  );
}
