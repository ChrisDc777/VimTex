"use client";

import { useMemo } from "react";
import {
  buildDiagnosticExplainInstruction,
  buildDiagnosticFixInstruction,
} from "@/lib/diagnostics-ai-actions";
import {
  renderNoteDiagnostics,
  type MathDiagnostic,
} from "@/lib/render-note";

type StudioDiagnosticsBarProps = {
  note: string;
  /** Studio-only AI entry points (#53). */
  canExplain?: boolean;
  canFix?: boolean;
  onRun: (instruction: string) => void;
};

/**
 * Compact Studio error strip — only mounts when there are math diagnostics.
 */
export function StudioDiagnosticsBar({
  note,
  canExplain = false,
  canFix = false,
  onRun,
}: StudioDiagnosticsBarProps) {
  const diagnostics = useMemo(() => renderNoteDiagnostics(note), [note]);
  if (diagnostics.length === 0) return null;

  const showAi = canExplain || canFix;

  return (
    <div className="vt-studio-diag" role="region" aria-label="Math diagnostics">
      <p className="vt-studio-diag__title">
        {diagnostics.length} math error{diagnostics.length === 1 ? "" : "s"}
      </p>
      <ul className="vt-studio-diag__list">
        {diagnostics.slice(0, 5).map((diag, index) => (
          <DiagnosticRow
            key={`${diag.line}:${diag.column}:${index}`}
            note={note}
            diag={diag}
            canExplain={canExplain}
            canFix={canFix}
            showAi={showAi}
            onRun={onRun}
          />
        ))}
      </ul>
      {diagnostics.length > 5 ? (
        <p className="vt-studio-diag__more">+{diagnostics.length - 5} more</p>
      ) : null}
    </div>
  );
}

function DiagnosticRow({
  note,
  diag,
  canExplain,
  canFix,
  showAi,
  onRun,
}: {
  note: string;
  diag: MathDiagnostic;
  canExplain: boolean;
  canFix: boolean;
  showAi: boolean;
  onRun: (instruction: string) => void;
}) {
  return (
    <li className="vt-studio-diag__item">
      <span className="vt-studio-diag__loc">
        L{diag.line}:{diag.column}
      </span>
      <span className="vt-studio-diag__msg" title={diag.message}>
        {diag.message}
      </span>
      {showAi ? (
        <span className="vt-studio-diag__actions">
          {canExplain ? (
            <button
              type="button"
              className="vt-studio-diag__btn"
              onClick={() =>
                onRun(buildDiagnosticExplainInstruction(note, diag))
              }
            >
              Explain
            </button>
          ) : null}
          {canFix ? (
            <button
              type="button"
              className="vt-studio-diag__btn"
              onClick={() => onRun(buildDiagnosticFixInstruction(note, diag))}
            >
              Fix
            </button>
          ) : null}
        </span>
      ) : null}
    </li>
  );
}
