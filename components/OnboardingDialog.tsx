"use client";

import { useEffect, useId } from "react";

type OnboardingDialogProps = {
  open: boolean;
  onClose: () => void;
};

const STEPS = [
  { title: "Edit", body: "Type in the editor. Esc then i for Insert mode." },
  { title: "Preview", body: "Split shows live KaTeX; Realtime renders inline." },
  { title: "Share", body: "Copy the room link so peers join the same buffer." },
  { title: "@ai", body: "Open Chat and mention @ai to edit the note." },
];

export function OnboardingDialog({ open, onClose }: OnboardingDialogProps) {
  const titleId = useId();

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
        className="vt-dialog vt-elevated w-full max-w-sm rounded-[var(--radius-sm)] p-6"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <p id={titleId} className="vt-caption text-ink">
          Welcome to VimTex
        </p>
        <p className="mt-2 text-sm leading-5 text-body">
          Ephemeral Vim + LaTeX scratchpad. Thirty seconds to start:
        </p>
        <ul className="mt-4 space-y-3">
          {STEPS.map((step) => (
            <li key={step.title}>
              <p className="text-sm font-medium text-ink">{step.title}</p>
              <p className="text-sm leading-5 text-body">{step.body}</p>
            </li>
          ))}
        </ul>
        <div className="mt-5">
          <button
            type="button"
            onClick={onClose}
            className="vt-pill vt-pill--solid vt-pill--label min-w-[7.5rem]"
          >
            Start editing
          </button>
        </div>
      </div>
    </div>
  );
}
