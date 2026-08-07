"use client";

import { useState } from "react";
import { LatexPreview } from "@/components/LatexPreview";

type AiPreviewReviewProps = {
  before: string;
  after: string;
};

/**
 * Rendered Before/After for Split (or Forge preview) while an AI edit is pending.
 * Does not write into Yjs — only displays proposal strings.
 */
export function AiPreviewReview({ before, after }: AiPreviewReviewProps) {
  const [side, setSide] = useState<"before" | "after">("after");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className="vt-segment mx-2 mt-2 shrink-0 self-start"
        role="group"
        aria-label="AI preview version"
      >
        <button
          type="button"
          aria-pressed={side === "before"}
          className={
            side === "before"
              ? "vt-segment__btn vt-segment__btn--active"
              : "vt-segment__btn"
          }
          onClick={() => setSide("before")}
        >
          Before
        </button>
        <button
          type="button"
          aria-pressed={side === "after"}
          className={
            side === "after"
              ? "vt-segment__btn vt-segment__btn--active"
              : "vt-segment__btn"
          }
          onClick={() => setSide("after")}
        >
          After
        </button>
      </div>
      <p className="vt-caption shrink-0 px-2 py-1 text-mute">
        AI proposal preview — Accept in chat to apply
      </p>
      <div className="min-h-0 flex-1 overflow-hidden">
        <LatexPreview note={side === "before" ? before : after} />
      </div>
    </div>
  );
}
