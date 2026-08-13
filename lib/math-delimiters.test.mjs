import assert from "node:assert/strict";
import test from "node:test";
import {
  hasMarkdownDollarMath,
  markdownDollarsToVimtex,
  vimtexToMarkdownDollars,
} from "./math-delimiters.ts";

test("converts dollar math to VimTex delimiters", () => {
  assert.equal(
    markdownDollarsToVimtex("see $x^2$ and $$E=mc^2$$"),
    "see \\(x^2\\) and \\[E=mc^2\\]",
  );
});

test("preserves escaped dollars", () => {
  assert.equal(markdownDollarsToVimtex("cost is \\$5"), "cost is \\$5");
});

test("leaves VimTex delimiters alone", () => {
  assert.equal(
    markdownDollarsToVimtex("\\(a\\) and \\[b\\]"),
    "\\(a\\) and \\[b\\]",
  );
});

test("converts VimTex delimiters to Markdown dollars", () => {
  assert.equal(
    vimtexToMarkdownDollars("see \\(x^2\\) and \\[E=mc^2\\]"),
    "see $x^2$ and $$E=mc^2$$",
  );
});

test("round-trips explicit math", () => {
  const src = "prose \\(a+b\\) and \\[c\\]\n";
  assert.equal(markdownDollarsToVimtex(vimtexToMarkdownDollars(src)), src);
});

test("leaves unmatched dollars alone", () => {
  assert.equal(markdownDollarsToVimtex("cost $5"), "cost $5");
});

test("hasMarkdownDollarMath", () => {
  assert.equal(hasMarkdownDollarMath("see $x$"), true);
  assert.equal(hasMarkdownDollarMath("see \\(x\\)"), false);
  assert.equal(hasMarkdownDollarMath("cost \\$5"), false);
  assert.equal(hasMarkdownDollarMath("cost $5"), false);
});
