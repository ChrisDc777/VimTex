"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { ViewToggle } from "@/components/ViewToggle";
import { LatexPreview } from "@/components/LatexPreview";
import { StatusBar } from "@/components/StatusBar";
import { ExportMenu } from "@/components/ExportMenu";
import type { VimEditorHandle } from "@/components/VimEditor";
import { STARTER_NOTE } from "@/lib/starter-content";
import { loadNote, loadViewMode, saveNote, saveViewMode } from "@/lib/storage";
import type { ViewMode, VimMode } from "@/lib/types";

const VimEditor = dynamic(
  () =>
    import("@/components/VimEditor").then((m) => m.VimEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center px-5 font-mono text-xs uppercase tracking-[1.2px] text-mute">
        Loading editor…
      </div>
    ),
  },
);

export default function HomePage() {
  const [note, setNote] = useState(STARTER_NOTE);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [vimMode, setVimMode] = useState<VimMode>("normal");
  const [hydrated, setHydrated] = useState(false);
  const editorRef = useRef<VimEditorHandle>(null);

  useEffect(() => {
    const storedNote = loadNote();
    const storedMode = loadViewMode();
    if (storedNote != null) setNote(storedNote);
    if (storedMode != null) setViewMode(storedMode);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveNote(note);
  }, [note, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveViewMode(viewMode);
  }, [viewMode, hydrated]);

  const handleViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    requestAnimationFrame(() => editorRef.current?.focus());
  }, []);

  const isSplit = viewMode === "split";

  return (
    <div className="flex h-dvh flex-col bg-canvas text-ink">
      <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-hairline px-4">
        <div className="flex min-w-0 items-center gap-4">
          <span className="font-mono text-sm uppercase tracking-[1.4px] text-ink">
            VimTex
          </span>
          <span className="hidden font-mono text-xs uppercase tracking-[1.2px] text-mute sm:inline">
            {vimModeLabel(vimMode)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle value={viewMode} onChange={handleViewMode} />
          <ExportMenu note={note} />
        </div>
      </header>

      <main
        className={
          isSplit
            ? "flex min-h-0 flex-1 flex-col md:flex-row"
            : "min-h-0 flex-1"
        }
      >
        <section
          className={
            isSplit
              ? "min-h-0 flex-[0.55] border-b border-hairline md:border-b-0 md:border-r"
              : "h-full min-h-0"
          }
        >
          <VimEditor
            ref={editorRef}
            value={note}
            onChange={setNote}
            viewMode={viewMode}
            onVimModeChange={setVimMode}
          />
        </section>

        {isSplit ? (
          <section className="min-h-0 flex-[0.45] bg-canvas">
            <LatexPreview note={note} />
          </section>
        ) : null}
      </main>

      <StatusBar vimMode={vimMode} />
    </div>
  );
}

function vimModeLabel(mode: VimMode): string {
  const m = mode.toLowerCase();
  if (m.startsWith("vis")) return "VISUAL";
  if (m.startsWith("ins")) return "INSERT";
  if (m.startsWith("rep")) return "REPLACE";
  return "NORMAL";
}
