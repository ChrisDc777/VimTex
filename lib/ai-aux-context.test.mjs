import assert from "node:assert/strict";
import test from "node:test";
import {
  formatAiCitations,
  formatAiDiagnostics,
  formatAiOutline,
} from "./ai-aux-format.ts";

test("formatAiDiagnostics lists line:col and message", () => {
  const text = formatAiDiagnostics([
    { line: 3, column: 2, message: "Expected }" },
    { line: 10, column: 1, message: "Undefined control sequence" },
  ]);
  assert.match(text, /L3:2\s+Expected \}/);
  assert.match(text, /L10:1\s+Undefined/);
});

test("formatAiDiagnostics caps and notes overflow", () => {
  const diags = Array.from({ length: 25 }, (_, i) => ({
    line: i + 1,
    column: 1,
    message: `err ${i}`,
  }));
  const text = formatAiDiagnostics(diags, 5);
  assert.match(text, /\+20 more/);
  assert.equal(text.split("\n").length, 6);
});

test("formatAiOutline indents by depth", () => {
  const text = formatAiOutline([
    { level: "section", title: "Intro", line: 2, depth: 0 },
    { level: "subsection", title: "Details", line: 8, depth: 1 },
  ]);
  assert.match(text, /^L2 \\section\{Intro\}/m);
  assert.match(text, /^  L8 \\subsection\{Details\}/m);
});

test("formatAiCitations lists key and kind", () => {
  const text = formatAiCitations([
    { key: "knuth84", kind: "article" },
    { key: "lamport", kind: "bibitem" },
  ]);
  assert.equal(text, "knuth84 (article)\nlamport (bibitem)");
});
