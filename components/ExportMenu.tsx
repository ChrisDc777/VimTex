"use client";

import { exportAsMd, exportAsTex } from "@/lib/export";

type ExportMenuProps = {
  note: string;
};

export function ExportMenu({ note }: ExportMenuProps) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => exportAsTex(note)}
        className="rounded-full border border-hairline bg-canvas px-3 py-1 text-sm text-ink hover:border-body-mid transition-colors"
      >
        .tex
      </button>
      <button
        type="button"
        onClick={() => exportAsMd(note)}
        className="rounded-full border border-hairline bg-canvas px-3 py-1 text-sm text-ink hover:border-body-mid transition-colors"
      >
        .md
      </button>
    </div>
  );
}
