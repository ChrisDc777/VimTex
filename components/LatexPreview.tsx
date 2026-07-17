"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { renderNoteToHtml } from "@/lib/render-note";

type LatexPreviewProps = {
  note: string;
  debounceMs?: number;
};

export function LatexPreview({ note, debounceMs = 75 }: LatexPreviewProps) {
  const [html, setHtml] = useState(() => renderNoteToHtml(note));
  const latest = useRef(note);
  latest.current = note;

  useEffect(() => {
    const id = window.setTimeout(() => {
      setHtml(renderNoteToHtml(latest.current));
    }, debounceMs);
    return () => window.clearTimeout(id);
  }, [note, debounceMs]);

  const markup = useMemo(() => ({ __html: html }), [html]);

  return (
    <div
      className="latex-preview h-full overflow-auto px-5 py-4"
      dangerouslySetInnerHTML={markup}
    />
  );
}
