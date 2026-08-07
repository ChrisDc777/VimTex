import {
  Decoration,
  type DecorationSet,
  EditorView,
  WidgetType,
} from "@codemirror/view";
import {
  type EditorState,
  RangeSetBuilder,
  StateField,
} from "@codemirror/state";
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

function buildDecorations(state: EditorState): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const text = state.doc.toString();
  const cursor = state.selection.main.head;
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

    const multiline = text.slice(seg.from, seg.to).includes("\n");
    // Multi-line *inline* `\(...\)` replaces are fragile in CM; skip those.
    // Multi-line *display* `\[...\]` uses a block widget (must come from a
    // StateField — ViewPlugin cannot provide block decorations).
    if (multiline && !seg.display) {
      continue;
    }
    if (seg.from < lastTo) continue;

    const { html, error } = renderMathToHtml(seg.content, seg.display, {
      displaystyle: !seg.display,
    });

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
        block: multiline && seg.display,
      }),
    );
    lastTo = seg.to;
  }

  return builder.finish();
}

/**
 * Live/Realtime math widgets. StateField (not ViewPlugin) so multi-line
 * display `\[...\]` can use block decorations without crashing CM/Yjs updates.
 */
export const mathInlineWidgets = StateField.define<DecorationSet>({
  create(state) {
    return buildDecorations(state);
  },
  update(deco, tr) {
    if (tr.docChanged || tr.selection) {
      return buildDecorations(tr.state);
    }
    return deco;
  },
  provide: (field) => EditorView.decorations.from(field),
});
