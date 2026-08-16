"use client";
// beui.dev/components/motion/morphing-modal

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { EASE_OUT, SPRING_PANEL } from "@/components/beui/lib/ease";
import { cn } from "@/components/beui/lib/utils";

export interface MorphingModalProps {
  /** Which view is currently shown. `null` closes the modal. */
  viewId: string | null;
  onClose: () => void;
  children: ReactNode;
  /** "bottom" anchors to the viewport bottom (mobile-like). "center" centers vertically. */
  placement?: "bottom" | "center";
  className?: string;
}

/**
 * Family-app-style modal: one panel that morphs height as `viewId` changes,
 * with a blur cross-fade on inner content.
 */
export function MorphingModal({
  viewId,
  onClose,
  children,
  placement = "bottom",
  className,
}: MorphingModalProps) {
  const open = viewId !== null;
  const reduce = useReducedMotion();
  const enterY = reduce ? 0 : placement === "bottom" ? 40 : 20;
  const enterScale = reduce ? 1 : 0.97;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div
          className={cn(
            "fixed inset-0 z-[90] flex justify-center p-4",
            // Clear the bottom dock when sheet sits above it.
            placement === "bottom" ? "items-end pb-24 sm:pb-28" : "items-center",
          )}
        >
          <motion.button
            type="button"
            aria-label="Close modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-black/40 [backdrop-filter:blur(14px)_saturate(140%)] [-webkit-backdrop-filter:blur(14px)_saturate(140%)]"
          />

          <motion.div
            key="panel"
            layout
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: enterY, scale: enterScale }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{
              opacity: 0,
              y: enterY,
              scale: reduce ? 1 : 0.98,
              transition: { duration: 0.18, ease: EASE_OUT },
            }}
            transition={SPRING_PANEL}
            className={cn(
              // Near-black card like beUI dark demos — darker than Studio canvas-elevated.
              "pointer-events-auto relative w-full max-w-sm overflow-visible rounded-3xl border border-white/[0.08] bg-[#0b0b0d] text-ink shadow-[0_24px_80px_rgba(0,0,0,0.65)] will-change-transform",
              className,
            )}
          >
            <motion.div layout="position" className="overflow-visible p-5">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={viewId}
                  initial={
                    reduce
                      ? { opacity: 0 }
                      : { opacity: 0, y: 8, filter: "blur(4px)" }
                  }
                  animate={
                    reduce
                      ? {
                          opacity: 1,
                          transition: { duration: 0.18, ease: EASE_OUT },
                        }
                      : {
                          opacity: 1,
                          y: 0,
                          filter: "blur(0px)",
                          transition: { duration: 0.24, ease: EASE_OUT },
                        }
                  }
                  exit={
                    reduce
                      ? {
                          opacity: 0,
                          transition: { duration: 0.14, ease: EASE_OUT },
                        }
                      : {
                          opacity: 0,
                          y: -8,
                          filter: "blur(4px)",
                          transition: { duration: 0.16, ease: EASE_OUT },
                        }
                  }
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
