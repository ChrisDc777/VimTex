import assert from "node:assert/strict";
import test from "node:test";
import {
  looksLikeTexSnippet,
  normalizeChatMathDelimiters,
  prepareChatMathText,
  unwrapTexBackticks,
} from "./chat-math.ts";

test("converts dollar math to VimTex delimiters", () => {
  assert.equal(
    normalizeChatMathDelimiters("see $x^2$ and $$E=mc^2$$"),
    "see \\(x^2\\) and \\[E=mc^2\\]",
  );
});

test("preserves escaped dollars", () => {
  assert.equal(normalizeChatMathDelimiters("cost is \\$5"), "cost is \\$5");
});

test("leaves VimTex delimiters alone", () => {
  assert.equal(
    normalizeChatMathDelimiters("\\(a\\) and \\[b\\]"),
    "\\(a\\) and \\[b\\]",
  );
});

test("unwraps TeX wrapped in backticks", () => {
  assert.equal(
    unwrapTexBackticks("use `\\frac{1}{2}` here"),
    "use \\(\\frac{1}{2}\\) here",
  );
  assert.equal(
    unwrapTexBackticks("keep `const x = 1` as code"),
    "keep `const x = 1` as code",
  );
  assert.equal(
    unwrapTexBackticks("already `\\(x^2\\)`"),
    "already \\(x^2\\)",
  );
});

test("looksLikeTexSnippet", () => {
  assert.equal(looksLikeTexSnippet("\\frac{1}{2}"), true);
  assert.equal(looksLikeTexSnippet("const x = 1"), false);
});

test("prepareChatMathText combines unwrap + dollars", () => {
  assert.equal(
    prepareChatMathText("see `$x^2$` please"),
    "see \\(x^2\\) please",
  );
});

test("unwraps TeX wrapped in bold stars", () => {
  assert.equal(
    prepareChatMathText("answer **\\(E=mc^2\\)** here"),
    "answer \\(E=mc^2\\) here",
  );
  assert.equal(
    prepareChatMathText("keep **important** prose"),
    "keep **important** prose",
  );
});
