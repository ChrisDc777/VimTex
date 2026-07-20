"use client";

import { exportAsMd, exportAsTex } from "@/lib/export";

type ExportMenuProps = {
  note: string;
};

export function ExportMenu({ note }: ExportMenuProps) {
  return (
    <div className="flex items-center gap-1.5" aria-label="Export">
      <button
        type="button"
        onClick={() => exportAsTex(note)}
        className="vt-pill vt-pill--ghost vt-pill--label"
        title="Export as LaTeX"
      >
        .tex
      </button>
      <button
        type="button"
        onClick={() => exportAsMd(note)}
        className="vt-pill vt-pill--ghost vt-pill--label"
        title="Export as Markdown"
      >
        .md
      </button>
    </div>
  );
}
