import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  flattenOutline,
  parseTexOutline,
} from "./tex-outline.ts";

describe("parseTexOutline", () => {
  it("builds a nested part/section/subsection tree", () => {
    const src = String.raw`
\part{Alpha}
\section{One}
\subsection{A}
\subsection{B}
\section{Two}
\part{Beta}
\section{Three}
`;
    const outline = parseTexOutline(src);
    assert.equal(outline.roots.length, 2);
    assert.equal(outline.roots[0].title, "Alpha");
    assert.equal(outline.roots[0].children.length, 2);
    assert.equal(outline.roots[0].children[0].title, "One");
    assert.equal(outline.roots[0].children[0].children.length, 2);
    assert.equal(outline.roots[0].children[0].children[0].title, "A");
    assert.equal(outline.roots[1].title, "Beta");
    assert.equal(outline.roots[1].children[0].title, "Three");
  });

  it("handles chapter + section without part", () => {
    const src = String.raw`
\chapter{Intro}
\section{Background}
`;
    const outline = parseTexOutline(src);
    assert.equal(outline.roots.length, 1);
    assert.equal(outline.roots[0].level, "chapter");
    assert.equal(outline.roots[0].depth, 0);
    assert.equal(outline.roots[0].children[0].level, "section");
    assert.equal(outline.roots[0].children[0].depth, 1);
  });

  it("ignores commented-out sectioning commands", () => {
    const src = String.raw`
\section{Live}
% \section{Dead}
\subsection{Child}
`;
    const outline = parseTexOutline(src);
    const flat = flattenOutline(outline);
    assert.deepEqual(
      flat.map((n) => n.title),
      ["Live", "Child"],
    );
  });

  it("counts \\todo macros per section", () => {
    const src = String.raw`
\section{Methods}
\todo{cite paper}
Some text.
\subsection{Details}
\todo{fill in}
\todo[urgent]{more}
`;
    const outline = parseTexOutline(src);
    assert.equal(outline.totalTodos, 3);
    assert.equal(outline.roots[0].todoCount, 1);
    assert.equal(outline.roots[0].todos[0].text, "cite paper");
    assert.equal(outline.roots[0].todos[0].kind, "macro");
    assert.equal(outline.roots[0].children[0].todoCount, 2);
  });

  it("flags TODO comments and preamble todos", () => {
    const src = String.raw`
% TODO before any section
\section{Body}
% TODO fix notation
x = 1 % not a todo marker alone
`;
    const outline = parseTexOutline(src);
    assert.equal(outline.preambleTodos.length, 1);
    assert.equal(outline.preambleTodos[0].kind, "comment");
    assert.match(outline.preambleTodos[0].text, /before any section/);
    assert.equal(outline.roots[0].todoCount, 1);
    assert.equal(outline.roots[0].todos[0].text, "fix notation");
    assert.equal(outline.totalTodos, 2);
  });

  it("records 1-based line numbers for jump targets", () => {
    const src = [
      "\\section{First}",
      "text",
      "\\subsection{Second}",
      "\\todo{here}",
    ].join("\n");
    const outline = parseTexOutline(src);
    assert.equal(outline.roots[0].line, 1);
    assert.equal(outline.roots[0].children[0].line, 3);
    assert.equal(outline.roots[0].children[0].todos[0].line, 4);
  });

  it("reads optional short titles and starred forms", () => {
    const src = String.raw`
\section*[Short]{Long title}
\subsection{Nested}
`;
    const outline = parseTexOutline(src);
    assert.equal(outline.roots[0].title, "Long title");
    assert.equal(outline.roots[0].children[0].title, "Nested");
  });

  it("returns empty roots for plain prose", () => {
    const outline = parseTexOutline("hello\nworld\n");
    assert.deepEqual(outline.roots, []);
    assert.equal(outline.totalTodos, 0);
  });
});
