"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import {
  AI_PROVIDERS,
  CUSTOM_MODEL_PATTERN,
  providerForModel,
  type AiModelId,
} from "@/lib/ai-providers";
import {
  hasUserAiKey,
  saveUserAiKey,
  type AiKeyBackend,
} from "@/lib/ai-keys";
import { loadCustomModels, saveCustomModels } from "@/lib/ai-custom-models";
import { ChevronIcon } from "@/components/chat/icons";

type ChatModelPickerProps = {
  model: AiModelId;
  onChange: (model: AiModelId) => void;
  disabled?: boolean;
};

type AnchorRect = {
  top: number;
  right: number;
};

type KeyEditorProps = {
  backend: AiKeyBackend;
  label: string;
  placeholder: string;
  hasKey: boolean;
  onChanged: () => void;
};

function KeyEditor({
  backend,
  label,
  placeholder,
  hasKey,
  onChanged,
}: KeyEditorProps) {
  const [show, setShow] = useState(false);
  const [draft, setDraft] = useState("");

  const save = () => {
    saveUserAiKey(draft, backend);
    onChanged();
    setShow(false);
    setDraft("");
  };

  const remove = () => {
    saveUserAiKey("", backend);
    onChanged();
    setShow(false);
    setDraft("");
  };

  return (
    <div className="vt-chat-model-menu__key">
      {hasKey ? (
        <>
          <div className="vt-chat-model-menu__key-actions">
            <button
              type="button"
              className="vt-chat-model-menu__key-link"
              onClick={() => setShow((v) => !v)}
            >
              {show ? "Cancel" : `Change ${label}`}
            </button>
            <button
              type="button"
              className="vt-chat-model-menu__key-link"
              onClick={remove}
            >
              Remove
            </button>
          </div>
          {show ? (
            <div className="vt-chat-model-menu__key-row">
              <input
                type="password"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={placeholder}
                autoComplete="off"
                spellCheck={false}
                className="vt-chat-model-menu__key-input"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    save();
                  }
                }}
              />
              <button
                type="button"
                className="vt-chat-model-menu__key-save"
                onClick={save}
              >
                Save
              </button>
            </div>
          ) : null}
        </>
      ) : show ? (
        <div className="vt-chat-model-menu__key-row">
          <input
            type="password"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            autoComplete="off"
            spellCheck={false}
            className="vt-chat-model-menu__key-input"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                save();
              }
            }}
          />
          <button
            type="button"
            className="vt-chat-model-menu__key-save"
            onClick={save}
          >
            Save
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="vt-chat-model-menu__key-link"
          onClick={() => setShow(true)}
        >
          Add {label}
        </button>
      )}
    </div>
  );
}

export function ChatModelPicker({
  model,
  onChange,
  disabled,
}: ChatModelPickerProps) {
  const [open, setOpen] = useState(false);
  const [hasOrKey, setHasOrKey] = useState(false);
  const [hasOcKey, setHasOcKey] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customDraft, setCustomDraft] = useState("");
  const [customModels, setCustomModels] = useState<string[]>([]);
  const [anchor, setAnchor] = useState<AnchorRect | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const refreshKeys = () => {
    setHasOrKey(hasUserAiKey("openrouter"));
    setHasOcKey(hasUserAiKey("opencode"));
  };

  useEffect(() => {
    refreshKeys();
    setCustomModels(loadCustomModels());
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onScroll = (event: Event) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onResize = () => setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const currentProvider = providerForModel(model);
  const currentLabel =
    currentProvider.models.find((m) => m.id === model)?.label ?? model;

  const toggleOpen = () => {
    const next = !open;
    if (next) {
      const rect = rootRef.current
        ?.querySelector<HTMLElement>("button")
        ?.getBoundingClientRect();
      if (!rect) return;
      setAnchor({ top: rect.top, right: rect.right });
    }
    setOpen(next);
  };

  const selectModel = (next: AiModelId) => {
    onChange(next);
    setOpen(false);
  };

  const handleAddCustom = () => {
    const slug = customDraft.trim();
    if (!CUSTOM_MODEL_PATTERN.test(slug)) return;
    const next = customModels.includes(slug)
      ? customModels
      : [...customModels, slug];
    saveCustomModels(next);
    setCustomModels(next);
    selectModel(slug);
    setCustomDraft("");
    setShowCustom(false);
  };

  const handleRemoveCustom = (slug: string) => {
    const next = customModels.filter((s) => s !== slug);
    saveCustomModels(next);
    setCustomModels(next);
  };

  const menuStyle: CSSProperties | undefined = anchor
    ? {
        position: "fixed",
        right: Math.max(8, window.innerWidth - anchor.right),
        bottom: window.innerHeight - anchor.top + 6,
        zIndex: 999,
        width: "min(13.5rem, calc(100vw - 2rem))",
        maxHeight: "min(48vh, 18rem)",
        overflowY: "auto",
      }
    : undefined;

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        className="vt-chat-model-picker"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Model: ${currentLabel}`}
        title={`Model: ${currentLabel}`}
        onClick={toggleOpen}
      >
        <span className="vt-chat-model-picker__label">{currentLabel}</span>
        <ChevronIcon className={open ? "rotate-180" : ""} />
      </button>

      {open && anchor
        ? createPortal(
            <div
              id={menuId}
              ref={menuRef}
              role="listbox"
              aria-label="AI model"
              style={menuStyle}
              className="vt-elevated--sm vt-dropdown vt-chat-model-menu"
            >
              {AI_PROVIDERS.map((provider) => {
                const providerLocked =
                  provider.keySource === "user" && !hasOrKey;
                return (
                  <div key={provider.id} className="vt-chat-model-menu__group">
                    <p className="vt-chat-model-menu__group-label">
                      {provider.label}
                    </p>
                    <ul className="vt-chat-model-menu__list">
                      {provider.models.map((m) => (
                        <li key={m.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={m.id === model}
                            disabled={providerLocked}
                            className={
                              m.id === model
                                ? "vt-chat-model-menu__item vt-chat-model-menu__item--active"
                                : providerLocked
                                  ? "vt-chat-model-menu__item vt-chat-model-menu__item--disabled"
                                  : "vt-chat-model-menu__item"
                            }
                            onClick={() => selectModel(m.id)}
                          >
                            <span className="vt-chat-model-menu__name">
                              {m.label}
                            </span>
                          </button>
                        </li>
                      ))}
                      {provider.id === "byok-openrouter"
                        ? customModels.map((slug) => (
                            <li
                              key={slug}
                              className="vt-chat-model-menu__custom"
                            >
                              <button
                                type="button"
                                role="option"
                                aria-selected={slug === model}
                                disabled={providerLocked}
                                className={
                                  slug === model
                                    ? "vt-chat-model-menu__item vt-chat-model-menu__item--active"
                                    : providerLocked
                                      ? "vt-chat-model-menu__item vt-chat-model-menu__item--disabled"
                                      : "vt-chat-model-menu__item"
                                }
                                onClick={() => selectModel(slug)}
                              >
                                <span className="vt-chat-model-menu__name">
                                  {slug}
                                </span>
                              </button>
                              <button
                                type="button"
                                className="vt-chat-model-menu__custom-remove"
                                aria-label={`Remove ${slug}`}
                                title="Remove"
                                onClick={() => handleRemoveCustom(slug)}
                              >
                                ×
                              </button>
                            </li>
                          ))
                        : null}
                    </ul>
                  </div>
                );
              })}

              <div className="vt-chat-model-menu__group">
                <p className="vt-chat-model-menu__group-label">Keys</p>
                <KeyEditor
                  backend="openrouter"
                  label="OpenRouter key"
                  placeholder="sk-or-v1-…"
                  hasKey={hasOrKey}
                  onChanged={refreshKeys}
                />
                <KeyEditor
                  backend="opencode"
                  label="OpenCode key"
                  placeholder="opencode…"
                  hasKey={hasOcKey}
                  onChanged={refreshKeys}
                />
              </div>

              <div className="vt-chat-model-menu__group">
                <div className="vt-chat-model-menu__key">
                  {showCustom ? (
                    <div className="vt-chat-model-menu__key-row">
                      <input
                        type="text"
                        value={customDraft}
                        onChange={(e) => setCustomDraft(e.target.value)}
                        placeholder="provider/model"
                        autoComplete="off"
                        spellCheck={false}
                        className="vt-chat-model-menu__key-input"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddCustom();
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="vt-chat-model-menu__key-save"
                        onClick={handleAddCustom}
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="vt-chat-model-menu__key-link"
                      onClick={() => setShowCustom(true)}
                    >
                      Custom model…
                    </button>
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
