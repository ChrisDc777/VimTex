"use client";

import { useEffect, useId, useState, type PointerEvent } from "react";

type PremiumPlansDialogProps = {
  open: boolean;
  onClose: () => void;
};

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    features: ["Solo editing", "Local autosave", "AI chat"],
    cta: "Current plan",
    current: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$8",
    period: "per month",
    features: ["Live share", "Room chat", "Priority sync"],
    cta: "Upgrade",
    recommended: true,
  },
  {
    id: "team",
    name: "Team",
    price: "$16",
    period: "per month",
    features: ["Everything in Pro", "Shared workspaces", "Admin controls"],
    cta: "Upgrade",
  },
] as const;

export function PremiumPlansDialog({ open, onClose }: PremiumPlansDialogProps) {
  const titleId = useId();
  const subtitleId = useId();
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setNotice(null);
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleUpgrade = () => {
    setNotice("Coming soon — premium plans are not available yet.");
    window.setTimeout(() => onClose(), 1400);
  };

  const dismissFromBackdrop = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div
      className="vt-overlay fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={subtitleId}
      onPointerDown={dismissFromBackdrop}
    >
      <div
        className="vt-dialog vt-elevated vt-pricing-dialog w-full max-w-2xl rounded-[var(--radius-md)]"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className="vt-pricing-dialog__header">
          <div className="vt-pricing-dialog__header-text">
            <p id={titleId} className="vt-caption text-ink">
              Choose a plan
            </p>
          </div>
          <button
            type="button"
            className="vt-pricing-dialog__close"
            aria-label="Close"
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </header>

        <div className="vt-pricing-dialog__body">
          <p id={subtitleId} className="text-sm leading-5 text-body">
            Unlock live rooms, real-time sync, and shared chat with collaborators.
          </p>

          <div className="vt-pricing-grid">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={
                  "recommended" in plan && plan.recommended
                    ? "vt-pricing-card vt-pricing-card--recommended"
                    : "vt-pricing-card"
                }
              >
                {"recommended" in plan && plan.recommended ? (
                  <span className="vt-pricing-card__badge">Recommended</span>
                ) : null}
                <h3 className="vt-pricing-card__name">{plan.name}</h3>
                <p className="vt-pricing-card__price">
                  <span>{plan.price}</span>
                  <span className="vt-pricing-card__period">{plan.period}</span>
                </p>
                <ul className="vt-pricing-card__features">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={"current" in plan && plan.current}
                  className={
                    "current" in plan && plan.current
                      ? "vt-btn vt-btn--ghost vt-pricing-card__cta"
                      : "vt-btn vt-btn--solid vt-pricing-card__cta"
                  }
                  onClick={() => {
                    if ("current" in plan && plan.current) return;
                    handleUpgrade();
                  }}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>

          {notice ? (
            <p className="vt-pricing-notice" role="status">
              {notice}
            </p>
          ) : null}
        </div>

        <footer className="vt-pricing-dialog__footer">
          <button
            type="button"
            onClick={onClose}
            className="vt-btn vt-btn--ghost"
          >
            Maybe later
          </button>
        </footer>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M5 5 15 15M15 5 5 15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
