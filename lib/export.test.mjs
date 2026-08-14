import assert from "node:assert/strict";
import test from "node:test";
import { toMarkdownMathFile, wrapAsOverleafDocument } from "./export.ts";

test("wrapAsOverleafDocument wraps a fragment", () => {
  const out = wrapAsOverleafDocument("Hello \\(x\\)\n");
  assert.ok(out.includes("\\documentclass{article}"));
  assert.ok(out.includes("\\begin{document}"));
  assert.ok(out.includes("Hello \\(x\\)"));
  assert.ok(out.includes("\\end{document}"));
});

test("wrapAsOverleafDocument does not double-wrap", () => {
  const src =
    "\\documentclass{article}\n\\begin{document}\nHi\n\\end{document}\n";
  assert.equal(wrapAsOverleafDocument(src), src);
});

test("wrapAsOverleafDocument keeps VimTex delimiters and comments", () => {
  const out = wrapAsOverleafDocument("% note\nHello \\(x\\)\n");
  assert.ok(out.includes("% note"));
  assert.ok(out.includes("Hello \\(x\\)"));
  assert.ok(!out.includes("$x$"));
});

test("toMarkdownMathFile rewrites VimTex delimiters", () => {
  assert.equal(
    toMarkdownMathFile("see \\(x^2\\) and \\[E=mc^2\\]"),
    "see $x^2$ and $$E=mc^2$$\n",
  );
});

test("wrapAsOverleafDocument turns # headings into sections", () => {
  const out = wrapAsOverleafDocument("# VimTex\n\nHello \\(x\\)\n");
  assert.ok(out.includes("\\section*{VimTex}"));
  assert.ok(!out.includes("# VimTex"));
  assert.ok(out.includes("Hello \\(x\\)"));
});

test("wrapAsOverleafDocument wraps bare math for TeX", () => {
  const out = wrapAsOverleafDocument("See x^2 and \\frac{1}{2}\n");
  assert.ok(out.includes("\\(x^2"));
  assert.ok(out.includes("\\(\\frac{1}{2}"));
});
