import assert from "node:assert/strict";
import test from "node:test";
import { svgMarkupFromDataUrl } from "./equation-image.ts";

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
