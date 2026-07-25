"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AI_MODELS, type AiModelId } from "@/lib/ai-models";
import { ChevronIcon } from "@/components/chat/icons";

type ChatModelPickerProps = {
  model: AiModelId;
  onChange: (model: AiModelId) => void;
  disabled?: boolean;
};

export function ChatModelPicker({
  model,
  onChange,
  disabled,
}: ChatModelPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const current = AI_MODELS.find((m) => m.id === model) ?? AI_MODELS[0];

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        className="vt-chat-model-picker"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Model: ${current.label}`}
        title={`Model: ${current.label}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="vt-chat-model-picker__label">{current.label}</span>
        <ChevronIcon className={open ? "rotate-180" : ""} />
      </button>

      {open ? (
        <ul
          id={menuId}
          role="listbox"
          aria-label="AI model"
          className="vt-elevated--sm vt-dropdown vt-chat-model-menu"
        >
          {AI_MODELS.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                role="option"
                aria-selected={m.id === model}
                className={
                  m.id === model
                    ? "vt-chat-model-menu__item vt-chat-model-menu__item--active"
                    : "vt-chat-model-menu__item"
                }
                onClick={() => {
                  onChange(m.id);
                  setOpen(false);
                }}
              >
                <span className="vt-chat-model-menu__name">{m.label}</span>
                <span className="vt-chat-model-menu__desc">{m.description}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
