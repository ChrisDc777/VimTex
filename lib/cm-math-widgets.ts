import {
  Decoration,
  type DecorationSet,
  type EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { findMathAtCursor, parseNote, renderMathToHtml } from "./render-note";

class MathWidget extends WidgetType {
  constructor(
    readonly tex: string,
    readonly display: boolean,
    readonly html: string,
    readonly hasError: boolean,
  ) {
    super();
  }

  eq(other: MathWidget): boolean {
    return (
      this.tex === other.tex &&
      this.display === other.display &&
      this.html === other.html
    );
  }

  toDOM(): HTMLElement {
    const el = document.createElement(this.display ? "div" : "span");
    el.className = `cm-math-widget${this.display ? " cm-math-display" : ""}${
      this.hasError ? " cm-math-error" : ""
    }`;
    el.innerHTML = this.html;
    el.setAttribute("aria-hidden", "true");
    return el;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const text = view.state.doc.toString();
  const cursor = view.state.selection.main.head;
  const active = findMathAtCursor(text, cursor);

  const mathSegs = parseNote(text)
    .filter((seg) => seg.type === "math")
    .sort((a, b) => a.from - b.from);

  let lastTo = 0;

  for (const seg of mathSegs) {
    if (seg.type !== "math") continue;
    if (seg.from >= seg.to) continue;
    if (active && active.from === seg.from && active.to === seg.to) {
      continue;
    }

    // Only inline-replace single-line math. Multi-line block replaces are
    // easy to get wrong in CodeMirror and were crashing Realtime mode.
    if (text.slice(seg.from, seg.to).includes("\n")) {
      continue;
    }
    if (seg.from < lastTo) continue;

    const { html, error } = renderMathToHtml(seg.content, seg.display);

    builder.add(
      seg.from,
      seg.to,
      Decoration.replace({
        widget: new MathWidget(
          seg.content,
          seg.display,
          html,
          Boolean(error),
        ),
        inclusive: false,
        block: false,
      }),
    );
    lastTo = seg.to;
  }

  return builder.finish();
}

export const mathInlineWidgets = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.selectionSet ||
        update.viewportChanged
      ) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);
