import assert from "node:assert/strict";
import test from "node:test";
import { parseNote } from "./render-note.ts";

function mathContents(text) {
  return parseNote(text)
    .filter((seg) => seg.type === "math")
    .map((seg) => seg.content);
}

test("bare numeric superscripts render without delimiters", () => {
  assert.deepEqual(mathContents("2^5"), ["2^5"]);
  assert.deepEqual(mathContents("10^{20}"), ["10^{20}"]);
});

test("bare variables with superscripts render", () => {
  assert.deepEqual(mathContents("x^2 + y^2"), ["x^2 + y^2"]);
});

test("plain integers in prose stay text", () => {
  assert.deepEqual(mathContents("chapter 42"), []);
});

test("TeX commands still auto-detect", () => {
  assert.deepEqual(mathContents("hi \\frac{1}{2} there"), ["\\frac{1}{2} "]);
});

test("percent line comments are stripped from text but keep math", () => {
  const segments = parseNote("2^5 % inline note\n\\frac{1}{2} % trailing");
  const text = segments
    .filter((seg) => seg.type === "text")
    .map((seg) => seg.content)
    .join("|");
  assert.equal(text, "\n");
  assert.deepEqual(
    segments
      .filter((seg) => seg.type === "math")
      .map((seg) => seg.content),
    ["2^5 ", "\\frac{1}{2} "],
  );
});

test("percent inside explicit math is preserved", () => {
  const segments = parseNote("\\[50\\%\\]");
  const math = segments.find((seg) => seg.type === "math");
  assert.ok(math);
  assert.equal(math.content, "50\\%");
});
