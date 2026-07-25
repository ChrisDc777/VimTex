"use client";

import { exportAsMd, exportAsTex } from "@/lib/export";

type ExportMenuProps = {
  note: string;
  compact?: boolean;
};

export function ExportMenu({ note, compact }: ExportMenuProps) {
  const pillClass = compact
    ? "vt-pill vt-pill--ghost vt-pill--label vt-pill--compact"
    : "vt-pill vt-pill--ghost vt-pill--label";

  return (
    <div className="flex items-center gap-1" aria-label="Export">
      <button
        type="button"
        onClick={() => exportAsTex(note)}
        className={pillClass}
        title="Export as LaTeX"
      >
        .tex
      </button>
      <button
        type="button"
        onClick={() => exportAsMd(note)}
        className={pillClass}
        title="Export as Markdown"
      >
        .md
      </button>
    </div>
  );
}
