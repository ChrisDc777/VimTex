"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SidePanelHeader } from "@/components/SidePanelHeader";
import { attachEquationCopyBar } from "@/lib/equation-copy-bar";
import { renderNoteToHtml } from "@/lib/render-note";

type LatexPreviewProps = {
  note: string;
  debounceMs?: number;
};

export function LatexPreview({ note, debounceMs = 75 }: LatexPreviewProps) {
  const [html, setHtml] = useState(() => renderNoteToHtml(note));
  const latest = useRef(note);
  latest.current = note;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setHtml(renderNoteToHtml(latest.current));
    }, debounceMs);
    return () => window.clearTimeout(id);
  }, [note, debounceMs]);

  const markup = useMemo(() => ({ __html: html }), [html]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    return attachEquationCopyBar(container);
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SidePanelHeader title="Preview" />
      <div
        ref={scrollRef}
        className="latex-preview min-h-0 flex-1 overflow-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5"
        dangerouslySetInnerHTML={markup}
      />
    </div>
  );
}
