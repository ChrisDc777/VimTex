import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";

type MarkKind =
  | "comment"
  | "command"
  | "structure"
  | "environment"
  | "envName"
  | "mathDelim"
  | "bracket"
  | "number"
  | "operator"
  | "align"
  | "escape"
  | "string"
  | "specialChar";

const MARK_CLASS: Record<MarkKind, string> = {
  comment: "cm-latexComment",
  command: "cm-latexCommand",
  structure: "cm-latexStructure",
  environment: "cm-latexEnvironment",
  envName: "cm-latexEnvName",
  mathDelim: "cm-latexMathDelim",
  bracket: "cm-latexBracket",
  number: "cm-latexNumber",
  operator: "cm-latexOperator",
  align: "cm-latexAlign",
  escape: "cm-latexEscape",
  string: "cm-latexString",
  specialChar: "cm-latexSpecialChar",
};

const PRIORITY: Record<MarkKind, number> = {
  comment: 10,
  string: 9,
  environment: 8,
  envName: 7,
  structure: 6,
  command: 5,
  mathDelim: 5,
  escape: 4,
  specialChar: 4,
  align: 3,
  operator: 3,
  bracket: 2,
  number: 1,
};

type Span = { from: number; to: number; kind: MarkKind };

const STRUCTURE_COMMANDS = new Set([
  "title",
  "author",
  "date",
  "maketitle",
  "section",
  "subsection",
  "subsubsection",
  "paragraph",
  "chapter",
  "part",
  "documentclass",
  "usepackage",
  "label",
  "ref",
  "eqref",
  "cite",
  "bibliography",
  "bibliographystyle",
  "tableofcontents",
  "abstract",
  "thanks",
  "footnote",
  "marginpar",
]);

const TEXT_COMMANDS = new Set([
  "text",
  "textbf",
  "textit",
  "emph",
  "texttt",
  "textrm",
  "textsf",
  "textsc",
  "underline",
  "mathrm",
  "mathbf",
  "mathit",
  "mathsf",
  "mathtt",
  "operatorname",
]);

const COMMAND_RE = /\\[@a-zA-Z]+/g;
const ENV_NAME_RE = /\\(?:begin|end)\{([a-zA-Z*]+)\}/g;
const MATH_DELIM_RE = /\\(?:\(|\)|\[|\])/g;
const BRACKET_RE = /[{}[\]]/g;
const NUMBER_RE = /\b\d+(?:\.\d+)?\b/g;
const OPERATOR_RE = /[\^_]/g;
const ALIGN_RE = /&/g;
const ESCAPE_RE = /\\\\/g;
const SPECIAL_CHAR_RE = /\\[%&#$]/g;

function addMatches(
  spans: Span[],
  text: string,
  base: number,
  re: RegExp,
  kind: MarkKind,
) {
  re.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    spans.push({
      from: base + match.index,
      to: base + match.index + match[0].length,
      kind,
    });
  }
}

function addCommandMatches(spans: Span[], text: string, base: number) {
  COMMAND_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = COMMAND_RE.exec(text)) !== null) {
    const raw = match[0];
    const name = raw.slice(1);
    let kind: MarkKind = "command";
    if (name === "begin" || name === "end") {
      kind = "environment";
    } else if (STRUCTURE_COMMANDS.has(name)) {
      kind = "structure";
    }
    spans.push({
      from: base + match.index,
      to: base + match.index + raw.length,
      kind,
    });
  }
}

function addEnvNameMatches(spans: Span[], text: string, base: number) {
  ENV_NAME_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ENV_NAME_RE.exec(text)) !== null) {
    const braceStart = match.index + match[0].indexOf("{");
    const nameStart = braceStart + 1;
    const nameEnd = match.index + match[0].length - 1;
    spans.push({
      from: base + nameStart,
      to: base + nameEnd,
      kind: "envName",
    });
  }
}

function addTextStringMatches(spans: Span[], text: string, base: number) {
  const re = new RegExp(
    `\\\\(?:${[...TEXT_COMMANDS].join("|")})\\{([^}]*)\\}`,
    "g",
  );
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const content = match[1];
    if (!content) continue;
    const openBrace = match[0].indexOf("{");
    const from = base + match.index + openBrace + 1;
    spans.push({ from, to: from + content.length, kind: "string" });
  }
}

function resolveSpans(spans: Span[]): Span[] {
  spans.sort((a, b) => a.from - b.from || b.to - a.to - (a.to - a.from));
  const result: Span[] = [];
  for (const span of spans) {
    const conflictIdx = result.findIndex(
      (r) => span.from < r.to && span.to > r.from,
    );
    if (conflictIdx === -1) {
      result.push(span);
      continue;
    }
    const conflict = result[conflictIdx];
    if (PRIORITY[span.kind] > PRIORITY[conflict.kind]) {
      result[conflictIdx] = span;
    }
  }
  return result.sort((a, b) => a.from - b.from);
}

function buildHighlightDecorations(doc: string): DecorationSet {
  const spans: Span[] = [];
  let pos = 0;

  for (const line of doc.split("\n")) {
    const commentIdx = line.indexOf("%");
    const active = commentIdx === -1 ? line : line.slice(0, commentIdx);
    const activeBase = pos;

    if (commentIdx !== -1) {
      spans.push({
        from: pos + commentIdx,
        to: pos + line.length,
        kind: "comment",
      });
    }

    addCommandMatches(spans, active, activeBase);
    addEnvNameMatches(spans, active, activeBase);
    addTextStringMatches(spans, active, activeBase);
    addMatches(spans, active, activeBase, MATH_DELIM_RE, "mathDelim");
    addMatches(spans, active, activeBase, SPECIAL_CHAR_RE, "specialChar");
    addMatches(spans, active, activeBase, ESCAPE_RE, "escape");
    addMatches(spans, active, activeBase, ALIGN_RE, "align");
    addMatches(spans, active, activeBase, OPERATOR_RE, "operator");
    addMatches(spans, active, activeBase, BRACKET_RE, "bracket");
    addMatches(spans, active, activeBase, NUMBER_RE, "number");

    pos += line.length + 1;
  }

  const builder = new RangeSetBuilder<Decoration>();
  let lastTo = 0;
  for (const span of resolveSpans(spans)) {
    if (span.from >= span.to || span.from < lastTo) continue;
    builder.add(
      span.from,
      span.to,
      Decoration.mark({ class: MARK_CLASS[span.kind] }),
    );
    lastTo = span.to;
  }

  return builder.finish();
}

const latexHighlightPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildHighlightDecorations(view.state.doc.toString());
    }

    update(update: ViewUpdate) {
      if (update.docChanged) {
        this.decorations = buildHighlightDecorations(
          update.view.state.doc.toString(),
        );
      }
    }
  },
  { decorations: (v) => v.decorations },
);

export const latexHighlightExtension = [latexHighlightPlugin];
