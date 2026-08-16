"use client";

import { useMemo, useState } from "react";
import {
  diffLines,
  focusDiffLines,
  summarizeDiff,
  type DiffLine,
  type FocusedDiffRow,
} from "@/lib/text-diff";
import type { AiDiffProposalProps } from "@/components/chat/AiDiffProposal";

/**
 * Studio Enhanced note-edit review UI.
 * Same Accept/Reject contract as Basic `AiDiffProposal`, but focused hunks
 * and a file-diff chrome (no BEUI FileDiff — deferred while layout issues remain).
 */
export function EnhancedAiDiffProposal({
  before,
  after,
  onAccept,
  onReject,
  disabled = false,
  defaultExpanded = true,
}: AiDiffProposalProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const lines = useMemo(() => diffLines(before, after), [before, after]);
  const { added, removed } = useMemo(() => summarizeDiff(lines), [lines]);
  const focused = useMemo(() => focusDiffLines(lines, 1), [lines]);

  return (
    <div className="vt-focused-diff mt-2">
      <button
        type="button"
        className="vt-focused-diff__header"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="vt-focused-diff__file" aria-hidden>
          <FileCodeIcon />
        </span>
        <span className="vt-focused-diff__title">Note changes</span>
        <span className="vt-focused-diff__counts" aria-label={`${added} added, ${removed} removed`}>
          {added > 0 ? (
            <span className="vt-focused-diff__count vt-focused-diff__count--add">
              +{added}
            </span>
          ) : null}
          {removed > 0 ? (
            <span className="vt-focused-diff__count vt-focused-diff__count--del">
              −{removed}
            </span>
          ) : null}
        </span>
        <span
          className={
            expanded
              ? "vt-focused-diff__chevron vt-focused-diff__chevron--open"
              : "vt-focused-diff__chevron"
          }
          aria-hidden
        >
          ▾
        </span>
      </button>

      {expanded ? (
        <div className="vt-focused-diff__panel" aria-label="Diff preview">
          {focused.map((row, i) => (
            <FocusedRow key={i} row={row} />
          ))}
        </div>
      ) : null}

      <div className="vt-focused-diff__actions">
        <button
          type="button"
          className="vt-btn vt-btn--ghost text-xs"
          disabled={disabled}
          onClick={onReject}
        >
          Reject
        </button>
        <button
          type="button"
          className="vt-btn text-xs"
          disabled={disabled}
          onClick={onAccept}
        >
          Accept
        </button>
      </div>
    </div>
  );
}

function FocusedRow({ row }: { row: FocusedDiffRow }) {
  if (row.type === "gap") {
    return (
      <div className="vt-focused-diff__row vt-focused-diff__row--gap">
        <span className="vt-focused-diff__gutter" />
        <span className="vt-focused-diff__mark" />
        <span className="vt-focused-diff__text">…</span>
      </div>
    );
  }
  return <FocusedLineRow line={row.line} />;
}

function FocusedLineRow({ line }: { line: DiffLine }) {
  const lineNo = line.afterLine ?? line.beforeLine;
  const mark =
    line.kind === "add" ? "+" : line.kind === "del" ? "−" : "";
  const rowClass =
    line.kind === "add"
      ? "vt-focused-diff__row vt-focused-diff__row--add"
      : line.kind === "del"
        ? "vt-focused-diff__row vt-focused-diff__row--del"
        : "vt-focused-diff__row";

  return (
    <div className={rowClass}>
      <span className="vt-focused-diff__gutter">{lineNo ?? ""}</span>
      <span className="vt-focused-diff__mark">{mark}</span>
      <span className="vt-focused-diff__text">{line.text || " "}</span>
    </div>
  );
}

function FileCodeIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="m10 13-2 2 2 2" />
      <path d="m14 17 2-2-2-2" />
    </svg>
  );
}
