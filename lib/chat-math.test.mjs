import assert from "node:assert/strict";
import test from "node:test";
import { normalizeChatMathDelimiters } from "./chat-math.ts";

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
