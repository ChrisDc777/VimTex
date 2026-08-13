import assert from "node:assert/strict";
import test from "node:test";
import {
  extractLatexDocumentBody,
  normalizeImportedText,
  prepareImportedNote,
} from "./import-note.ts";

test("normalizeImportedText strips BOM and CRLF", () => {
  assert.equal(normalizeImportedText("\uFEFFa\r\nb\rc"), "a\nb\nc");
});

test("extractLatexDocumentBody returns null for fragments", () => {
  assert.equal(extractLatexDocumentBody("\\(x^2\\)\n"), null);
});

test("extractLatexDocumentBody keeps the document body", () => {
  const src = [
    "\\documentclass{article}",
    "\\begin{document}",
    "Hello \\(x\\)",
    "\\end{document}",
    "",
  ].join("\n");
  assert.equal(extractLatexDocumentBody(src), "Hello \\(x\\)\n");
});

test("prepareImportedNote leaves markdown fragments verbatim", () => {
  const md = "# Title\n\nSee $not-math$ and \\(x^2\\).\n";
  assert.equal(prepareImportedNote(md, "note.md"), md);
});

test("prepareImportedNote unwraps a .tex document", () => {
  const src = "\\documentclass{article}\n\\begin{document}\nBody\n\\end{document}\n";
  assert.equal(prepareImportedNote(src, "hw.tex"), "Body\n");
});

test("prepareImportedNote returns empty for preamble-only tex", () => {
  const src = "\\documentclass{article}\n\\begin{document}\n\\end{document}\n";
  assert.equal(prepareImportedNote(src, "empty.tex"), "");
});
