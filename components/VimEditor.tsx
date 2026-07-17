"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { Compartment, EditorState } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  drawSelection,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { getCM, vim } from "@replit/codemirror-vim";
import { mathInlineWidgets } from "@/lib/cm-math-widgets";
import type { ViewMode, VimMode } from "@/lib/types";

export type VimEditorHandle = {
  focus: () => void;
};

type VimEditorProps = {
  value: string;
  onChange: (value: string) => void;
  viewMode: ViewMode;
  onVimModeChange: (mode: VimMode) => void;
};

const vimTexTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "var(--canvas)",
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
      backgroundColor: "var(--canvas)",
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

export const VimEditor = forwardRef<VimEditorHandle, VimEditorProps>(
  function VimEditor(
    { value, onChange, viewMode, onVimModeChange },
    ref,
  ) {
    const hostRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const inlineMathRef = useRef(new Compartment());
    const onChangeRef = useRef(onChange);
    const onVimModeChangeRef = useRef(onVimModeChange);
    const skippingSync = useRef(false);

    onChangeRef.current = onChange;
    onVimModeChangeRef.current = onVimModeChange;

    useImperativeHandle(ref, () => ({
      focus: () => {
        viewRef.current?.focus();
      },
    }));

    useEffect(() => {
      if (!hostRef.current) return;

      const updateListener = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          skippingSync.current = true;
          onChangeRef.current(update.state.doc.toString());
          queueMicrotask(() => {
            skippingSync.current = false;
          });
        }
      });

      const state = EditorState.create({
        doc: value,
        extensions: [
          // vim() must come before other keymaps
          vim(),
          lineNumbers(),
          highlightActiveLine(),
          drawSelection(),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          vimTexTheme,
          EditorView.lineWrapping,
          updateListener,
          inlineMathRef.current.of(
            viewMode === "realtime" ? [mathInlineWidgets] : [],
          ),
        ],
      });

      const view = new EditorView({
        state,
        parent: hostRef.current,
      });
      viewRef.current = view;

      const onMode = (e: { mode?: string }) => {
        if (e?.mode) {
          onVimModeChangeRef.current(e.mode);
        }
      };
      // getCM is ready after the vim plugin constructs (same tick as EditorView).
      const cm = getCM(view);
      cm?.on("vim-mode-change", onMode);
      requestAnimationFrame(() => view.focus());

      return () => {
        cm?.off("vim-mode-change", onMode);
        view.destroy();
        viewRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
    }, []);

    useEffect(() => {
      const view = viewRef.current;
      if (!view || skippingSync.current) return;
      const current = view.state.doc.toString();
      if (current === value) return;
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }, [value]);

    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({
        effects: inlineMathRef.current.reconfigure(
          viewMode === "realtime" ? [mathInlineWidgets] : [],
        ),
      });
      requestAnimationFrame(() => view.focus());
    }, [viewMode]);

    return <div ref={hostRef} className="h-full min-h-0 w-full" />;
  },
);
