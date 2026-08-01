import {
  Compartment,
  RangeSet,
  RangeSetBuilder,
  StateField,
  type EditorState,
  type Extension,
} from "@codemirror/state";
import {
  EditorView,
  GutterMarker,
  gutter,
  gutters,
  lineNumbers,
} from "@codemirror/view";

class LineNumberMarker extends GutterMarker {
  constructor(readonly label: string) {
    super();
  }

  eq(other: LineNumberMarker): boolean {
    return other.label === this.label;
  }

  toDOM(): HTMLElement {
    const el = document.createElement("div");
    el.className = "cm-gutterElement";
    el.textContent = this.label;
    return el;
  }
}

function buildRelativeMarkers(state: EditorState): RangeSet<GutterMarker> {
  const builder = new RangeSetBuilder<GutterMarker>();
  const current = state.doc.lineAt(state.selection.main.head).number;

  for (let lineNo = 1; lineNo <= state.doc.lines; lineNo++) {
    const line = state.doc.line(lineNo);
    const label =
      lineNo === current ? String(lineNo) : String(Math.abs(lineNo - current));
    builder.add(line.from, line.from, new LineNumberMarker(label));
  }

  return builder.finish();
}

function relativeLineNumberField(): StateField<RangeSet<GutterMarker>> {
  return StateField.define<RangeSet<GutterMarker>>({
    create(state) {
      return buildRelativeMarkers(state);
    },
    update(markers, tr) {
      if (!tr.docChanged && !tr.selection) return markers;
      return buildRelativeMarkers(tr.state);
    },
  });
}

function relativeLineNumberGutter(
  field: StateField<RangeSet<GutterMarker>>,
): Extension {
  return gutter({
    class: "cm-lineNumbers",
    markers: (view) => view.state.field(field),
    initialSpacer: () => new LineNumberMarker("0"),
  });
}

export function lineNumberExtensions(relative: boolean): Extension[] {
  if (!relative) {
    return [lineNumbers()];
  }

  const field = relativeLineNumberField();
  return [field, gutters(), relativeLineNumberGutter(field)];
}

export function createLineNumberCompartment(): Compartment {
  return new Compartment();
}
