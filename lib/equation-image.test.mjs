import assert from "node:assert/strict";
import test from "node:test";
import {
  contentBoundingBox,
  dropExternalCssUrls,
  extractKatexCss,
  svgMarkupFromDataUrl,
} from "./equation-image.ts";

test("svgMarkupFromDataUrl decodes charset URL encoding", () => {
  const svg = "<svg xmlns='http://www.w3.org/2000/svg'></svg>";
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  assert.equal(svgMarkupFromDataUrl(dataUrl), svg);
});

test("svgMarkupFromDataUrl decodes base64", () => {
  const svg = "<svg></svg>";
  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
  assert.equal(svgMarkupFromDataUrl(dataUrl), svg);
});

test("svgMarkupFromDataUrl decodes UTF-8 base64", () => {
  const svg = "<svg>∑</svg>";
  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
  assert.equal(svgMarkupFromDataUrl(dataUrl), svg);
});

test("extractKatexCss keeps KaTeX font faces and vlist rules from a bundle", () => {
  const css = [
    "@font-face{font-family:KaTeX_Main;src:url(fonts/KaTeX_Main.woff2)}",
    "@font-face{font-family:Other;src:url(other.woff2)}",
    ".btn{color:red}",
    ".katex{font:1.2em KaTeX_Main}",
    ".katex .vlist{position:relative}",
    ".katex .vlist>span{position:absolute}",
  ].join("");
  const extracted = extractKatexCss(css);
  assert.match(extracted, /KaTeX_Main/);
  assert.match(extracted, /\.vlist\{position:relative\}/);
  assert.match(extracted, /position:absolute/);
  assert.doesNotMatch(extracted, /font-family:Other/);
  assert.doesNotMatch(extracted, /\.btn/);
});

test("extractKatexCss keeps layout rules from katex.min.css", async () => {
  const { readFile } = await import("node:fs/promises");
  const { dirname, join } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const css = await readFile(
    join(dirname(fileURLToPath(import.meta.url)), "../node_modules/katex/dist/katex.min.css"),
    "utf8",
  );
  const extracted = extractKatexCss(css);
  assert.match(extracted, /KaTeX_Size1/);
  assert.match(extracted, /\.vlist/);
  assert.match(extracted, /frac-line/);
  assert.match(extracted, /table-layout:fixed/);
  assert.match(extracted, /hide-tail/);
});

function rgbaBuffer(width, height, ink) {
  const data = new Uint8ClampedArray(width * height * 4);
  data.fill(255);
  for (const [x, y] of ink) {
    const i = (y * width + x) * 4;
    data[i] = 17;
    data[i + 1] = 17;
    data[i + 2] = 17;
    data[i + 3] = 255;
  }
  return data;
}

test("contentBoundingBox finds ink and ignores paper", () => {
  const data = rgbaBuffer(10, 8, [
    [2, 1],
    [7, 5],
  ]);
  const box = contentBoundingBox(data, 10, 8);
  assert.deepEqual(box, { minX: 2, minY: 1, maxX: 7, maxY: 5 });
});

test("contentBoundingBox returns null for a blank canvas", () => {
  const data = rgbaBuffer(4, 4, []);
  assert.equal(contentBoundingBox(data, 4, 4), null);
});

test("dropExternalCssUrls keeps data URIs and strips file urls", () => {
  const css =
    '@font-face{src:url(fonts/KaTeX.woff2),url("data:font/woff2;base64,AAA")}';
  const out = dropExternalCssUrls(css);
  assert.match(out, /data:font\/woff2;base64,AAA/);
  assert.doesNotMatch(out, /fonts\/KaTeX/);
});
