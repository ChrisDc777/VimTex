"use client";

import { useEffect, useId, useState } from "react";

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
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleUpgrade = () => {
    setNotice("Coming soon — premium plans are not available yet.");
    window.setTimeout(() => onClose(), 1400);
  };

  return (
    <div
      className="vt-overlay fixed inset-0 z-50 flex items-end justify-center bg-canvas/80 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={subtitleId}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="vt-dialog vt-elevated vt-pricing-dialog w-full max-w-2xl rounded-[var(--radius-md)] p-6">
        <p id={titleId} className="vt-caption text-ink">
          Choose a plan
        </p>
        <p id={subtitleId} className="mt-2 text-sm leading-5 text-body">
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

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="vt-btn vt-btn--ghost"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
