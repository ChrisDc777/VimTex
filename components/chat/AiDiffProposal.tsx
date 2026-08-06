"use client";

import { useMemo } from "react";
import { diffLines, summarizeDiff } from "@/lib/text-diff";

export type AiDiffProposalProps = {
  before: string;
  after: string;
  onAccept: () => void;
  onReject: () => void;
  disabled?: boolean;
};

export function AiDiffProposal({
  before,
  after,
  onAccept,
  onReject,
  disabled = false,
}: AiDiffProposalProps) {
  const lines = useMemo(() => diffLines(before, after), [before, after]);
  const { added, removed } = useMemo(() => summarizeDiff(lines), [lines]);

  return (
    <div className="vt-ai-diff mt-2 rounded border border-hairline bg-canvas/80">
      <div className="flex items-center justify-between gap-2 border-b border-hairline px-2 py-1.5">
        <p className="text-xs text-mute">
          Proposed note change{" "}
          <span className="font-mono text-ink">
            +{added} −{removed}
          </span>
        </p>
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
      <pre
        className="max-h-48 overflow-auto p-2 font-mono text-[11px] leading-snug"
        aria-label="Diff preview"
      >
        {lines.map((line, i) => {
          const prefix =
            line.kind === "add" ? "+" : line.kind === "del" ? "−" : " ";
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
            <div key={i} className={`${color} ${bg} whitespace-pre-wrap`}>
              <span className="select-none opacity-70">{prefix}</span>{" "}
              {line.text || " "}
            </div>
          );
        })}
      </pre>
    </div>
  );
}
