"use client";

import { useEffect, type RefObject } from "react";
import type { VimEditorHandle } from "@/components/VimEditor";
import { useAiReview } from "@/components/ai/AiReviewProvider";
import { changedBeforeLines } from "@/lib/text-diff";

/** Syncs pending AI edit line highlights into the CodeMirror gutter (#88). */
export function StudioAiDiffBridge({
  editorRef,
}: {
  editorRef: RefObject<VimEditorHandle | null>;
}) {
  const review = useAiReview();

  useEffect(() => {
    const pending = review.pending;
    if (!pending) {
      editorRef.current?.setAiDiffLines([]);
      return;
    }
    editorRef.current?.setAiDiffLines(
      changedBeforeLines(pending.before, pending.after),
    );
  }, [review.pending, editorRef]);

  return null;
}
