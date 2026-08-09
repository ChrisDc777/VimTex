/**
 * Heuristic TeX document outline + TODO scanner (#56).
 * Pure buffer parse — no AI. Works offline for the common case.
 */

export type OutlineLevel =
  | "part"
  | "chapter"
  | "section"
  | "subsection"
  | "subsubsection";

export type OutlineTodoKind = "macro" | "comment";

export type OutlineTodo = {
  /** 1-based line number in the source buffer. */
  line: number;
  /** Short display text (trimmed, truncated). */
  text: string;
  kind: OutlineTodoKind;
};

export type OutlineNode = {
  id: string;
  level: OutlineLevel;
  /** Nesting depth for indent (0 = top among present levels). */
  depth: number;
  title: string;
  /** 1-based line of the sectioning command. */
  line: number;
  todoCount: number;
  todos: OutlineTodo[];
  children: OutlineNode[];
};

export type TexOutline = {
  roots: OutlineNode[];
  /** TODOs before the first sectioning command. */
  preambleTodos: OutlineTodo[];
  totalTodos: number;
};

const LEVEL_RANK: Record<OutlineLevel, number> = {
  part: 0,
  chapter: 1,
  section: 2,
  subsection: 3,
  subsubsection: 4,
};

const SECTION_RE =
  /^\\(part|chapter|section|subsection|subsubsection)\*?(?=[\s{\[])/;

const TODO_MACRO_RE = /\\todo\*?\s*(?:\[[^\]]*\])?\s*\{/gi;

const MAX_TITLE = 120;
const MAX_TODO_TEXT = 80;

/** Strip a leading `%` comment; returns code portion only. */
function codeBeforeComment(line: string): string {
  let i = 0;
  while (i < line.length) {
    if (line[i] === "\\" && i + 1 < line.length) {
      i += 2;
      continue;
    }
    if (line[i] === "%") return line.slice(0, i);
    i += 1;
  }
  return line;
}

/** Extract `{...}` argument starting at `openBrace` (index of `{`). */
function readBracedArg(
  source: string,
  openBrace: number,
): { text: string; end: number } | null {
  if (source[openBrace] !== "{") return null;
  let depth = 0;
  let i = openBrace;
  let text = "";
  while (i < source.length) {
    const ch = source[i]!;
    if (ch === "\\" && i + 1 < source.length) {
      text += ch + source[i + 1]!;
      i += 2;
      continue;
    }
    if (ch === "{") {
      depth += 1;
      if (depth > 1) text += ch;
      i += 1;
      continue;
    }
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return { text, end: i + 1 };
      text += ch;
      i += 1;
      continue;
    }
    text += ch;
    i += 1;
  }
  return null;
}

function skipOptionalArgs(source: string, from: number): number {
  let i = from;
  while (i < source.length && /\s/.test(source[i]!)) i += 1;
  while (i < source.length && source[i] === "[") {
    const close = source.indexOf("]", i + 1);
    if (close < 0) return i;
    i = close + 1;
    while (i < source.length && /\s/.test(source[i]!)) i += 1;
  }
  return i;
}

function truncate(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function findSectionAt(
  code: string,
): { level: OutlineLevel; title: string } | null {
  const trimmed = code.trimStart();
  const m = SECTION_RE.exec(trimmed);
  if (!m) return null;
  const level = m[1] as OutlineLevel;
  let i = m[0].length;
  i = skipOptionalArgs(trimmed, i);
  if (trimmed[i] !== "{") {
    return { level, title: "(untitled)" };
  }
  const braced = readBracedArg(trimmed, i);
  if (!braced) return { level, title: "(untitled)" };
  const title = truncate(braced.text, MAX_TITLE) || "(untitled)";
  return { level, title };
}

function extractTodoMacros(code: string, line: number): OutlineTodo[] {
  const out: OutlineTodo[] = [];
  TODO_MACRO_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TODO_MACRO_RE.exec(code)) !== null) {
    const open = m.index + m[0].length - 1;
    if (code[open] !== "{") continue;
    const braced = readBracedArg(code, open);
    const text = braced
      ? truncate(braced.text, MAX_TODO_TEXT) || "\\todo"
      : "\\todo";
    out.push({ line, text, kind: "macro" });
    if (braced) TODO_MACRO_RE.lastIndex = braced.end;
  }
  return out;
}

/** `% … TODO …` comment markers (case-sensitive TODO token). */
function extractCommentTodo(line: string, lineNo: number): OutlineTodo | null {
  const pct = line.indexOf("%");
  if (pct < 0) return null;
  // Ignore escaped \%
  if (pct > 0 && line[pct - 1] === "\\") return null;
  const comment = line.slice(pct + 1);
  const todoIdx = comment.search(/\bTODO\b/);
  if (todoIdx < 0) return null;
  const after = comment.slice(todoIdx + 4).replace(/^[:\s-]+/, "");
  return {
    line: lineNo,
    text: truncate(after || "TODO", MAX_TODO_TEXT),
    kind: "comment",
  };
}

type FlatSection = {
  level: OutlineLevel;
  rank: number;
  title: string;
  line: number;
  todos: OutlineTodo[];
};

/**
 * Parse LaTeX buffer into a nested outline with per-section TODO counts.
 */
export function parseTexOutline(source: string): TexOutline {
  const lines = source.split(/\r\n|\n|\r/);
  const sections: FlatSection[] = [];
  const preambleTodos: OutlineTodo[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    const lineNo = i + 1;
    const code = codeBeforeComment(raw);
    const section = findSectionAt(code);
    if (section) {
      sections.push({
        level: section.level,
        rank: LEVEL_RANK[section.level],
        title: section.title,
        line: lineNo,
        todos: [],
      });
    }

    const todos: OutlineTodo[] = [
      ...extractTodoMacros(code, lineNo),
    ];
    const commentTodo = extractCommentTodo(raw, lineNo);
    if (commentTodo) todos.push(commentTodo);

    if (todos.length === 0) continue;
    if (sections.length === 0) {
      preambleTodos.push(...todos);
    } else {
      sections[sections.length - 1]!.todos.push(...todos);
    }
  }

  const totalTodos =
    preambleTodos.length +
    sections.reduce((n, s) => n + s.todos.length, 0);

  if (sections.length === 0) {
    return { roots: [], preambleTodos, totalTodos };
  }

  const minRank = Math.min(...sections.map((s) => s.rank));
  const nodes: OutlineNode[] = sections.map((s, idx) => ({
    id: `sec-${idx}-${s.line}`,
    level: s.level,
    depth: Math.max(0, s.rank - minRank),
    title: s.title,
    line: s.line,
    todoCount: s.todos.length,
    todos: s.todos,
    children: [],
  }));

  const roots: OutlineNode[] = [];
  const stack: OutlineNode[] = [];

  for (const node of nodes) {
    while (stack.length > 0 && stack[stack.length - 1]!.depth >= node.depth) {
      stack.pop();
    }
    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1]!.children.push(node);
    }
    stack.push(node);
  }

  return { roots, preambleTodos, totalTodos };
}

/** Flatten outline tree in document order (for simple list UIs). */
export function flattenOutline(outline: TexOutline): OutlineNode[] {
  const out: OutlineNode[] = [];
  const walk = (nodes: OutlineNode[]) => {
    for (const n of nodes) {
      out.push(n);
      if (n.children.length) walk(n.children);
    }
  };
  walk(outline.roots);
  return out;
}
