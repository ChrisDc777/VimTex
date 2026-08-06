"use client";

import { useMemo, useState } from "react";
import { diffLines, summarizeDiff } from "@/lib/text-diff";

export type AiDiffProposalProps = {
  before: string;
  after: string;
  onAccept: () => void;
  onReject: () => void;
  disabled?: boolean;
  /** Start expanded (default collapsed chip). */
  defaultExpanded?: boolean;
};

export function AiDiffProposal({
  before,
  after,
  onAccept,
  onReject,
  disabled = false,
  defaultExpanded = false,
}: AiDiffProposalProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const lines = useMemo(() => diffLines(before, after), [before, after]);
  const { added, removed } = useMemo(() => summarizeDiff(lines), [lines]);
  const previewLines = useMemo(
    () => lines.filter((l) => l.kind !== "same").slice(0, 6),
    [lines],
  );

  return (
    <div className="vt-ai-diff mt-2 rounded border border-hairline bg-canvas/80">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-2 py-1.5">
        <button
          type="button"
          className="min-w-0 text-left text-xs text-mute hover:text-ink"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <span className="font-medium text-ink">
            {expanded ? "Hide diff" : "Review"}
          </span>{" "}
          <span className="font-mono">
            +{added} −{removed}
          </span>
        </button>
        <div className="flex gap-1.5">
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

      {!expanded && previewLines.length > 0 ? (
        <pre
          className="max-h-24 overflow-hidden p-2 font-mono text-[11px] leading-snug opacity-80"
          aria-hidden
        >
          {previewLines.map((line, i) => (
            <DiffLineRow key={i} line={line} />
          ))}
          {lines.filter((l) => l.kind !== "same").length > 6 ? (
            <div className="text-mute">…</div>
          ) : null}
        </pre>
      ) : null}

      {expanded ? (
        <pre
          className="max-h-48 overflow-auto p-2 font-mono text-[11px] leading-snug"
          aria-label="Diff preview"
        >
          {lines.map((line, i) => (
            <DiffLineRow key={i} line={line} />
          ))}
        </pre>
      ) : null}
    </div>
  );
}

function DiffLineRow({
  line,
}: {
  line: { kind: "same" | "add" | "del"; text: string };
}) {
  const prefix = line.kind === "add" ? "+" : line.kind === "del" ? "−" : " ";
  const color =
    line.kind === "add"
      ? "text-emerald-700 dark:text-emerald-400"
      : line.kind === "del"
        ? "text-rose-700 dark:text-rose-400"
        : "text-mute";
  const bg =
    line.kind === "add"
      ? "bg-emerald-500/10"
      : line.kind === "del"
        ? "bg-rose-500/10"
        : "";
  return (
    <div className={`${color} ${bg} whitespace-pre-wrap`}>
      <span className="select-none opacity-70">{prefix}</span> {line.text || " "}
    </div>
  );
}
