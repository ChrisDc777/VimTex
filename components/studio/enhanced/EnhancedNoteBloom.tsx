"use client";

import dynamic from "next/dynamic";
import {
  ArrowDownUp,
  ClipboardCopy,
  FileCode2,
  FileDown,
  FileInput,
  FileText,
} from "lucide-react";
import { useMemo } from "react";
import type { BloomMenuItem } from "@/components/beui/motion/bloom-menu";
import { copyVimtexSourceToClipboard } from "@/lib/copy-note";
import { exportAsMd, exportAsPdf, exportAsTex } from "@/lib/export";
import { openNoteImport } from "@/lib/ui-events";

const BloomMenu = dynamic(
  () =>
    import("@/components/beui/motion/bloom-menu").then((m) => ({
      default: m.BloomMenu,
    })),
  { ssr: false },
);

const ITEMS: BloomMenuItem[] = [
  { id: "import", label: "Import", icon: FileInput, hint: ".tex / .md" },
  { id: "tex", label: "LaTeX", icon: FileCode2, hint: "Overleaf" },
  { id: "md", label: "Markdown", icon: FileText, hint: "$ math" },
  { id: "pdf", label: "PDF", icon: FileDown, hint: "print" },
  { id: "copy", label: "Copy", icon: ClipboardCopy, hint: "source" },
];

type EnhancedNoteBloomProps = {
  note: string;
  disabled?: boolean;
};

/** Topbar Import & Export Bloom — opens downward so it stays on-screen. */
export function EnhancedNoteBloom({ note, disabled }: EnhancedNoteBloomProps) {
  const items = useMemo(() => ITEMS, []);

  return (
    <BloomMenu
      items={items}
      triggerLabel="Import & Export"
      panelTitle="Import & Export"
      columns={3}
      placement="below"
      disabled={disabled}
      triggerIcon={<ArrowDownUp className="size-3.5 opacity-80" aria-hidden />}
      triggerClassName="vt-pill vt-pill--ghost !h-auto min-h-8 border-hairline bg-transparent px-2.5"
      onSelect={(id) => {
        switch (id) {
          case "import":
            openNoteImport();
            break;
          case "tex":
            exportAsTex(note);
            break;
          case "md":
            exportAsMd(note);
            break;
          case "pdf":
            exportAsPdf(note);
            break;
          case "copy":
            copyVimtexSourceToClipboard(note);
            break;
          default:
            break;
        }
      }}
    />
  );
}
