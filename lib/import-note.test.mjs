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

test("prepareImportedNote converts Markdown dollar math", () => {
  const md = "# Title\n\nSee $x^2$ and \\(y\\).\n";
  const prepared = prepareImportedNote(md, "note.md");
  assert.equal(prepared.convertedDollarMath, true);
  assert.equal(prepared.content, "# Title\n\nSee \\(x^2\\) and \\(y\\).\n");
});

test("prepareImportedNote unwraps a .tex document", () => {
  const src =
    "\\documentclass{article}\n\\begin{document}\nBody\n\\end{document}\n";
  const prepared = prepareImportedNote(src, "hw.tex");
  assert.equal(prepared.convertedDollarMath, false);
  assert.equal(prepared.content, "Body\n");
});

test("prepareImportedNote returns empty for preamble-only tex", () => {
  const src = "\\documentclass{article}\n\\begin{document}\n\\end{document}\n";
  assert.equal(prepareImportedNote(src, "empty.tex").content, "");
});
