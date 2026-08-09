/**
 * CodeMirror gutter + line marks for pending AI edits (#88).
 * Line-level only — no char widgets (Live math conflict).
 */

import {
  RangeSetBuilder,
  StateEffect,
  StateField,
  type Extension,
} from "@codemirror/state";
import {
  Decoration,
  EditorView,
  GutterMarker,
  gutter,
  type DecorationSet,
} from "@codemirror/view";

const setAiDiffLinesEffect = StateEffect.define<readonly number[]>();

const aiDiffLinesField = StateField.define<readonly number[]>({
  create: () => [],
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(setAiDiffLinesEffect)) return e.value;
    }
    return value;
  },
});

class AiDiffMarker extends GutterMarker {
  toDOM(): HTMLElement {
    const el = document.createElement("div");
    el.className = "cm-ai-diff-marker";
    el.textContent = "±";
    el.title = "Pending AI edit";
    return el;
  }

  eq(): boolean {
    return true;
  }
}

const aiDiffMarker = new AiDiffMarker();

function buildGutterMarkers(view: EditorView) {
  const lines = view.state.field(aiDiffLinesField, false) ?? [];
  const builder = new RangeSetBuilder<GutterMarker>();
  const doc = view.state.doc;
  for (const lineNo of lines) {
    if (lineNo < 1 || lineNo > doc.lines) continue;
    const line = doc.line(lineNo);
    builder.add(line.from, line.from, aiDiffMarker);
  }
  return builder.finish();
}

const aiDiffDecoField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    const linesChanged = tr.effects.some((e) => e.is(setAiDiffLinesEffect));
    if (!linesChanged && !tr.docChanged) return deco;
    const lines = tr.state.field(aiDiffLinesField, false) ?? [];
    if (lines.length === 0) return Decoration.none;
    const doc = tr.state.doc;
    const ranges = [];
    for (const lineNo of lines) {
      if (lineNo < 1 || lineNo > doc.lines) continue;
      const line = doc.line(lineNo);
      ranges.push(
        Decoration.line({ class: "cm-ai-diff-line" }).range(line.from),
      );
    }
    return Decoration.set(ranges, true);
  },
  provide: (f) => EditorView.decorations.from(f),
});

const aiDiffTheme = EditorView.baseTheme({
  ".cm-ai-diff-gutter .cm-gutterElement": {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  ".cm-ai-diff-marker": {
    color: "var(--focus)",
    fontSize: "10px",
    fontWeight: "600",
    lineHeight: "1",
    opacity: "0.85",
  },
  ".cm-ai-diff-line": {
    backgroundColor: "color-mix(in srgb, var(--focus) 10%, transparent)",
  },
});

/** Dispatch pending changed line numbers (1-based in the live `before` doc). */
export function setAiDiffLines(
  view: EditorView,
  lines: readonly number[],
): void {
  const prev = view.state.field(aiDiffLinesField, false) ?? [];
  if (
    prev.length === lines.length &&
    prev.every((n, i) => n === lines[i])
  ) {
    return;
  }
  view.dispatch({ effects: setAiDiffLinesEffect.of([...lines]) });
}

export function clearAiDiffLines(view: EditorView): void {
  setAiDiffLines(view, []);
}

export function aiDiffExtension(): Extension[] {
  return [
    aiDiffLinesField,
    aiDiffDecoField,
    gutter({
      class: "cm-ai-diff-gutter",
      markers: (view) => buildGutterMarkers(view),
      initialSpacer: () => aiDiffMarker,
    }),
    aiDiffTheme,
  ];
}
