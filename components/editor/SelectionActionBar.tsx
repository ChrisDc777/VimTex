"use client";

import { Fragment, useEffect, useId, useRef, useState } from "react";
import {
  SELECTION_AI_ACTIONS,
  type SelectionAiAction,
} from "@/lib/selection-ai-actions";

export type SelectionActionAnchor = {
  /** Viewport Y under the selection’s bottom edge. */
  top: number;
  /** Viewport X at the content column (past gutters). */
  left: number;
};

type SelectionActionBarProps = {
  visible: boolean;
  /** When caret/selection is inside a math span (#83). */
  equationScoped?: boolean;
  /** Show chat-only derivation coach (#84). */
  showCoach?: boolean;
  disabled?: boolean;
  /** Fixed viewport position: content column, under selection bottom. */
  anchor?: SelectionActionAnchor | null;
  onAction: (action: SelectionAiAction) => void;
};

const PRIMARY_IDS = new Set(["explain", "simplify", "fix"]);

/**
 * Quiet AI chips — under the selection bottom, starting in the typing column.
 */
export function SelectionActionBar({
  visible,
  equationScoped = false,
  showCoach = false,
  disabled = false,
  anchor = null,
  onAction,
}: SelectionActionBarProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const moreId = useId();

  useEffect(() => {
    if (!visible) setMoreOpen(false);
  }, [visible]);

  useEffect(() => {
    if (!moreOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  if (!visible) return null;

  const actions = (() => {
    let list = [...SELECTION_AI_ACTIONS];
    if (!equationScoped) {
      list = list.filter((a) => a.id !== "rewriteEq");
    }
    if (!showCoach) {
      list = list.filter((a) => a.id !== "coach");
    }
    return list;
  })();

  const primary = actions.filter((a) => PRIMARY_IDS.has(a.id));
  const more = actions.filter((a) => !PRIMARY_IDS.has(a.id));
  const chips = [
    ...primary.map((action) => ({ kind: "action" as const, action })),
    ...(more.length > 0 ? [{ kind: "more" as const }] : []),
  ];

  const style =
    anchor != null
      ? {
          left: Math.max(8, anchor.left),
          top: Math.max(8, anchor.top),
          right: "auto" as const,
          bottom: "auto" as const,
          transform: "none",
        }
      : undefined;

  return (
    <div
      ref={rootRef}
      className={
        anchor != null
          ? "vt-sel-actions vt-sel-actions--anchored"
          : "vt-sel-actions"
      }
      style={style}
      role="toolbar"
      aria-label="Selection AI"
    >
      <span className="vt-sel-actions__hint">
        {equationScoped ? "Equation" : "Selection"}
      </span>
      <div className="vt-sel-actions__btns">
        {chips.map((chip, i) => (
          <Fragment key={chip.kind === "action" ? chip.action.id : "more"}>
            {i > 0 ? (
              <span className="vt-sel-actions__sep" aria-hidden>
                |
              </span>
            ) : null}
            {chip.kind === "action" ? (
              <button
                type="button"
                className="vt-sel-actions__btn"
                disabled={disabled}
                onClick={() => {
                  setMoreOpen(false);
                  onAction(chip.action);
                }}
              >
                {chip.action.label}
              </button>
            ) : (
              <div className="vt-sel-actions__more">
                <button
                  type="button"
                  className="vt-sel-actions__btn"
                  disabled={disabled}
                  aria-expanded={moreOpen}
                  aria-controls={moreId}
                  onClick={() => setMoreOpen((v) => !v)}
                >
                  More
                </button>
                {moreOpen ? (
                  <div
                    id={moreId}
                    role="menu"
                    className="vt-sel-actions__more-menu"
                  >
                    {more.map((action) => (
                      <button
                        key={action.id}
                        type="button"
                        role="menuitem"
                        className="vt-sel-actions__more-item"
                        disabled={disabled}
                        onClick={() => {
                          setMoreOpen(false);
                          onAction(action);
                        }}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
