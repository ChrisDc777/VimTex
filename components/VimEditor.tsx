"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { Compartment, EditorState, Prec } from "@codemirror/state";
import {
  EditorView,
  keymap,
  highlightActiveLine,
  drawSelection,
} from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";
import { CodeMirror, getCM, vim, Vim } from "@replit/codemirror-vim";
import * as Y from "yjs";
import { yCollab, yUndoManagerKeymap } from "y-codemirror.next";
import { mathInlineWidgets } from "@/lib/cm-math-widgets";
import { editorPlaceholder } from "@/lib/cm-placeholder";
import { latexCompletionExtension } from "@/lib/cm-latex-completion";
import { latexHighlightExtension } from "@/lib/cm-latex-highlight";
import {
  createLineNumberCompartment,
  lineNumberExtensions,
} from "@/lib/cm-line-numbers";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import {
  SNIPPET_CURSOR,
  SNIPPET_SEL_CLOSE,
  SNIPPET_SEL_OPEN,
} from "@/lib/snippets";
import { EDITOR_PLACEHOLDER } from "@/lib/starter-content";
import type { VimMode } from "@/lib/types";

export type VimEditorHandle = {
  focus: () => void;
  /**
   * Insert a snippet template at the cursor, honoring SNIPPET_CURSOR /
   * SNIPPET_SEL_* markers from lib/snippets.
   */
  insertSnippet: (template: string) => void;
};

type VimEditorProps = {
  /** When false, plain CodeMirror keybindings (no Vim). Default true. */
  vimEnabled?: boolean;
  /** Render KaTeX inline widgets in the editor. Default true. */
  inlineMath?: boolean;
  /** Show relative line numbers in the gutter (default true). */
  relativeLineNumbers?: boolean;
  /** Show empty-editor placeholder. Default true. */
  showPlaceholder?: boolean;
  onVimModeChange: (mode: VimMode) => void;
};

const vimTexTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "transparent",
      color: "var(--ink)",
      height: "100%",
    },
    ".cm-content": {
      caretColor: "var(--ink)",
      fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
    },
    "&.cm-focused .cm-cursor": {
      borderLeftColor: "var(--ink)",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "color-mix(in srgb, var(--ink) 18%, transparent)",
    },
    ".cm-gutters": {
      backgroundColor: "transparent",
      color: "var(--mute)",
      borderRight: "1px solid var(--hairline)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "transparent",
    },
    ".cm-activeLine": {
      backgroundColor: "transparent",
    },
  },
  { dark: true },
);

/** Remote peer cursor/selection labels, matched to the app's design tokens. */
const remoteSelectionTheme = EditorView.theme({
  ".cm-ySelectionInfo": {
    fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
    fontSize: "10px",
    fontWeight: "600",
    lineHeight: "1.6",
    borderRadius: "4px",
    paddingLeft: "5px",
    paddingRight: "5px",
    top: "-1.45em",
    boxShadow: "0 1px 4px rgba(0, 0, 0, 0.35)",
  },
  ".cm-ySelectionCaret": {
    borderLeftWidth: "1.5px",
    borderRightWidth: "1.5px",
  },
  ".cm-ySelectionCaretDot": {
    border: "1px solid var(--canvas)",
    width: "0.42em",
    height: "0.42em",
    top: "-0.24em",
    left: "-0.24em",
  },
});

/** Active Y.UndoManager for the live editor — used by Vim chord maps. */
let activeUndoManager: Y.UndoManager | null = null;

let vimUndoWired = false;
function wireVimUndoRedo(): void {
  if (vimUndoWired) return;
  vimUndoWired = true;
  Vim.defineAction("yUndo", () => {
    activeUndoManager?.undo();
  });
  Vim.defineAction("yRedo", () => {
    activeUndoManager?.redo();
  });
  for (const ctx of ["normal", "insert", "visual"] as const) {
    Vim.mapCommand("<C-S-z>", "action", "yRedo", {}, { context: ctx });
    Vim.mapCommand("<D-S-z>", "action", "yRedo", {}, { context: ctx });
    Vim.mapCommand("<C-z>", "action", "yUndo", {}, { context: ctx });
    Vim.mapCommand("<D-z>", "action", "yUndo", {}, { context: ctx });
  }
}

export const VimEditor = forwardRef<VimEditorHandle, VimEditorProps>(
  function VimEditor(
    {
      vimEnabled = true,
      inlineMath = true,
      relativeLineNumbers = true,
      showPlaceholder = true,
      onVimModeChange,
    },
    ref,
  ) {
    const workspace = useWorkspace();
    const hostRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const inlineMathRef = useRef(new Compartment());
    const lineNumberCompartmentRef = useRef(createLineNumberCompartment());
    const onVimModeChangeRef = useRef(onVimModeChange);

    onVimModeChangeRef.current = onVimModeChange;

    useImperativeHandle(ref, () => ({
      focus: () => {
        viewRef.current?.focus();
      },
      insertSnippet: (template) => {
        const view = viewRef.current;
        if (!view || workspace?.readOnly) return;
        const markerPattern = /[\uE000\uE001\uE002]/g;
        const sel = view.state.selection.main;
        const stripped = template.replace(markerPattern, "");
        const idxBefore = (n: number) =>
          template.slice(0, n).replace(markerPattern, "").length;

        const cursorIdx = template.indexOf(SNIPPET_CURSOR);
        const selOpenIdx = template.indexOf(SNIPPET_SEL_OPEN);
        const selCloseIdx = template.indexOf(SNIPPET_SEL_CLOSE);

        let anchor = sel.from + stripped.length;
        let head: number | undefined;
        if (cursorIdx >= 0) {
          anchor = sel.from + idxBefore(cursorIdx);
        } else if (selOpenIdx >= 0 && selCloseIdx > selOpenIdx) {
          anchor = sel.from + idxBefore(selCloseIdx);
          head = sel.from + idxBefore(selOpenIdx);
        }

        view.dispatch({
          changes: {
            from: sel.from,
            to: sel.to,
            insert: stripped,
          },
          selection: { anchor, head },
          scrollIntoView: true,
        });
        view.focus();
      },
    }));

    useEffect(() => {
      const host = hostRef.current;
      if (!host || !workspace) return;

      const { ytext, provider, undoManager: um } = workspace;

      wireVimUndoRedo();
      activeUndoManager = um;

      const prevUndo = CodeMirror.commands.undo;
      const prevRedo = CodeMirror.commands.redo;
      const runYUndo = () => {
        um.undo();
        return true;
      };
      const runYRedo = () => {
        um.redo();
        return true;
      };
      CodeMirror.commands.undo = (cm) => {
        if (viewRef.current && cm.cm6 === viewRef.current) {
          runYUndo();
          return;
        }
        prevUndo?.(cm);
      };
      CodeMirror.commands.redo = (cm) => {
        if (viewRef.current && cm.cm6 === viewRef.current) {
          runYRedo();
          return;
        }
        prevRedo?.(cm);
      };

      const yUndoKeys = Prec.highest(
        keymap.of([
          { key: "Mod-z", run: runYUndo, preventDefault: true },
          { key: "Mod-y", run: runYRedo, preventDefault: true },
          { key: "Mod-Shift-z", run: runYRedo, preventDefault: true },
          ...yUndoManagerKeymap,
        ]),
      );

      const state = EditorState.create({
        doc: ytext.toString(),
        extensions: [
          ...(vimEnabled ? [vim()] : []),
          lineNumberCompartmentRef.current.of(
            lineNumberExtensions(relativeLineNumbers),
          ),
          highlightActiveLine(),
          drawSelection(),
          yUndoKeys,
          ...latexCompletionExtension,
          ...latexHighlightExtension,
          keymap.of(defaultKeymap),
          vimTexTheme,
          remoteSelectionTheme,
          EditorView.lineWrapping,
          yCollab(ytext, provider.awareness, { undoManager: um }),
          ...(workspace.readOnly
            ? [EditorState.readOnly.of(true), EditorView.editable.of(false)]
            : []),
          inlineMathRef.current.of(inlineMath ? [mathInlineWidgets] : []),
          ...(showPlaceholder ? editorPlaceholder(EDITOR_PLACEHOLDER) : []),
        ],
      });

      const view = new EditorView({
        state,
        parent: host,
      });
      viewRef.current = view;

      const onMode = (e: { mode?: string }) => {
        if (e?.mode) {
          onVimModeChangeRef.current(e.mode);
        }
      };
      const cm = vimEnabled ? getCM(view) : null;
      if (vimEnabled) {
        cm?.on("vim-mode-change", onMode);
      } else {
        onVimModeChangeRef.current("normal");
      }
      requestAnimationFrame(() => view.focus());

      return () => {
        if (vimEnabled) {
          cm?.off("vim-mode-change", onMode);
        }
        CodeMirror.commands.undo = prevUndo;
        CodeMirror.commands.redo = prevRedo;
        if (activeUndoManager === um) activeUndoManager = null;
        view.destroy();
        viewRef.current = null;
      };
      // Remount when the workspace (room/collab) or Vim binding changes.
      // inlineMath/relativeLineNumbers/showPlaceholder reconfigure via
      // compartments/placeholder below — no view remount needed.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspace, vimEnabled]);

    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({
        effects: inlineMathRef.current.reconfigure(
          inlineMath ? [mathInlineWidgets] : [],
        ),
      });
    }, [inlineMath]);

    useEffect(() => {
      const view = viewRef.current;
      const compartment = lineNumberCompartmentRef.current;
      if (!view) return;
      view.dispatch({
        effects: compartment.reconfigure(
          lineNumberExtensions(relativeLineNumbers),
        ),
      });
    }, [relativeLineNumbers]);

    return <div ref={hostRef} className="h-full min-h-0 w-full" />;
  },
);
