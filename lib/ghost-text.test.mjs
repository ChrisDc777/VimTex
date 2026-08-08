import assert from "node:assert/strict";
import test from "node:test";
import {
  computeGhostSuggestion,
  suggestEndEnvironment,
  suggestMathCloser,
} from "./ghost-text.ts";

test("suggests \\end after \\begin{theorem}", () => {
  const doc = "\\begin{theorem}";
  const s = suggestEndEnvironment(doc, doc.length);
  assert.ok(s);
  assert.equal(s.text, "\n\\end{theorem}");
});

test("skips when \\end already follows", () => {
  const doc = "\\begin{theorem}\\end{theorem}";
  const head = "\\begin{theorem}".length;
  assert.equal(suggestEndEnvironment(doc, head), null);
});

test("suggests closing display math", () => {
  const doc = "\\[x^2";
  const s = suggestMathCloser(doc, doc.length);
  assert.ok(s);
  assert.equal(s.text, "\\]");
});

test("computeGhostSuggestion prefers begin/end", () => {
  const doc = "\\begin{proof}";
  const s = computeGhostSuggestion(doc, doc.length);
  assert.equal(s?.text, "\n\\end{proof}");
});
