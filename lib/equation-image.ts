/**
 * Snapshot a KaTeX equation as PNG / SVG by painting the laid-out DOM.
 * SVG foreignObject → canvas is rejected or tainted in Chromium, which made
 * PNG/SVG copy fail entirely.
 */

import { renderMathToHtml } from "./render-note.ts";

const INK = "#111111";
const PAPER = "#ffffff";
const PAD = 20;
const SCALE = 2;
const WHITE_THRESHOLD = 250;

const KATEX_FONTS = [
  "KaTeX_Main",
  "KaTeX_Math",
  "KaTeX_Size1",
  "KaTeX_Size2",
  "KaTeX_Size3",
  "KaTeX_Size4",
  "KaTeX_AMS",
  "KaTeX_Caligraphic",
  "KaTeX_Fraktur",
  "KaTeX_SansSerif",
  "KaTeX_Script",
  "KaTeX_Typewriter",
];

/** Pull KaTeX @font-face and .katex rules out of a (possibly bundled) stylesheet. */
export function extractKatexCss(css: string): string {
  const out: string[] = [];
  const faces = css.match(/@font-face\s*\{[^{}]*\}/gi) ?? [];
  for (const face of faces) {
    if (/KaTeX/i.test(face)) out.push(face);
  }
  const rest = css.replace(/@font-face\s*\{[^{}]*\}/gi, "");
  const rules = rest.match(/[^{}]*katex[^{}]*\{[^{}]*\}/gi) ?? [];
  for (const rule of rules) {
    const trimmed = rule.trim();
    if (trimmed) out.push(trimmed);
  }
  return out.join("\n");
}

/** Drop non-data URLs so SVG rasterization cannot taint the canvas. */
export function dropExternalCssUrls(css: string): string {
  return css.replace(
    /url\(\s*(['"]?)([^)'"]*)\1\s*\)/gi,
    (full, _quote: string, url: string) =>
      url.startsWith("data:")
        ? full
        : "url(data:application/octet-stream;base64,)",
  );
}

type Box = { left: number; top: number; right: number; bottom: number };

function unionBox(el: HTMLElement): Box {
  const origin = el.getBoundingClientRect();
  let left = origin.left;
  let top = origin.top;
  let right = origin.right;
  let bottom = origin.bottom;
  const visit = (node: Element) => {
    for (const r of node.getClientRects()) {
      left = Math.min(left, r.left);
      top = Math.min(top, r.top);
      right = Math.max(right, r.right);
      bottom = Math.max(bottom, r.bottom);
    }
  };
  visit(el);
  for (const node of el.querySelectorAll("*")) visit(node);
  return { left, top, right, bottom };
}

/** Bounding box of non-paper pixels. Used to crop extra canvas padding. */
export function contentBoundingBox(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  threshold = WHITE_THRESHOLD,
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const r = data[i] ?? 255;
      const g = data[i + 1] ?? 255;
      const b = data[i + 2] ?? 255;
      if (r >= threshold && g >= threshold && b >= threshold) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;
  return { minX, minY, maxX, maxY };
}

async function nextFrame(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

async function waitKatexFonts(): Promise<void> {
  await document.fonts.ready;
  await Promise.all(
    KATEX_FONTS.map((family) =>
      document.fonts.load(`16px "${family}"`).catch(() => undefined),
    ),
  );
}

function isDisplayEquation(wrapper: HTMLElement): boolean {
  return (
    wrapper.classList.contains("katex-display-wrap") ||
    Boolean(wrapper.querySelector(".katex-display"))
  );
}

function mountFresh(wrapper: HTMLElement): HTMLElement {
  const tex = wrapper.getAttribute("data-tex") ?? "";
  const { html, error } = renderMathToHtml(tex, isDisplayEquation(wrapper));
  if (error) throw new Error(error);

  const host = document.createElement("div");
  host.className = "vt-equation-export-host";
  host.style.fontSize = getComputedStyle(wrapper).fontSize;
  host.innerHTML = html;
  host.querySelector(".katex-mathml")?.remove();
  document.body.appendChild(host);
  return host;
}

function parsePx(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function paintBorders(
  ctx: CanvasRenderingContext2D,
  el: Element,
  style: CSSStyleDeclaration,
): void {
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return;
  const sides = [
    {
      w: parsePx(style.borderTopWidth),
      c: style.borderTopColor,
      s: style.borderTopStyle,
      x: r.left,
      y: r.top,
      width: r.width,
      height: parsePx(style.borderTopWidth),
    },
    {
      w: parsePx(style.borderBottomWidth),
      c: style.borderBottomColor,
      s: style.borderBottomStyle,
      x: r.left,
      y: r.bottom - parsePx(style.borderBottomWidth),
      width: r.width,
      height: parsePx(style.borderBottomWidth),
    },
    {
      w: parsePx(style.borderLeftWidth),
      c: style.borderLeftColor,
      s: style.borderLeftStyle,
      x: r.left,
      y: r.top,
      width: parsePx(style.borderLeftWidth),
      height: r.height,
    },
    {
      w: parsePx(style.borderRightWidth),
      c: style.borderRightColor,
      s: style.borderRightStyle,
      x: r.right - parsePx(style.borderRightWidth),
      y: r.top,
      width: parsePx(style.borderRightWidth),
      height: r.height,
    },
  ];
  for (const side of sides) {
    if (side.w <= 0 || side.s === "none") continue;
    ctx.fillStyle = side.c || INK;
    ctx.fillRect(side.x, side.y, side.width, Math.max(side.height, 0.5));
  }
}

function paintText(ctx: CanvasRenderingContext2D, node: Text): void {
  const text = node.data;
  if (!text) return;
  if (!text.trim() && !text.includes("\u00a0")) return;
  const parent = node.parentElement;
  if (!parent) return;
  const style = getComputedStyle(parent);
  const range = document.createRange();
  range.selectNodeContents(node);
  const rects = [...range.getClientRects()];
  range.detach();
  if (rects.length === 0) return;
  ctx.fillStyle = style.color || INK;
  ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  ctx.textBaseline = "bottom";
  ctx.textAlign = "left";
  if (rects.length === 1) {
    const r = rects[0]!;
    ctx.fillText(text, r.left, r.bottom);
    return;
  }
  // Split by character so wrapped/kerned runs still land on their boxes.
  let offset = 0;
  for (const r of rects) {
    let taken = "";
    while (offset < text.length) {
      const next = taken + text[offset];
      if (ctx.measureText(next).width > r.width + 0.75 && taken) break;
      taken = next;
      offset += 1;
    }
    if (taken) ctx.fillText(taken, r.left, r.bottom);
  }
}

function paintNode(ctx: CanvasRenderingContext2D, node: Node): void {
  if (node.nodeType === Node.TEXT_NODE) {
    paintText(ctx, node as Text);
    return;
  }
  if (!(node instanceof Element)) return;
  if (node.classList.contains("katex-mathml")) return;
  const style = getComputedStyle(node);
  if (style.display === "none" || style.visibility === "hidden") return;
  const clip =
    style.overflow === "hidden" ||
    style.overflowX === "hidden" ||
    style.overflowY === "hidden";
  if (clip) {
    const r = node.getBoundingClientRect();
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.left, r.top, r.width, r.height);
    ctx.clip();
  }
  paintBorders(ctx, node, style);
  for (const child of node.childNodes) paintNode(ctx, child);
  if (clip) ctx.restore();
}

function trimCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
): HTMLCanvasElement {
  let box: ReturnType<typeof contentBoundingBox> = null;
  try {
    box = contentBoundingBox(
      ctx.getImageData(0, 0, canvas.width, canvas.height).data,
      canvas.width,
      canvas.height,
    );
  } catch {
    return canvas;
  }
  if (!box) return canvas;
  const pad = PAD * SCALE;
  const x = Math.max(0, box.minX - pad);
  const y = Math.max(0, box.minY - pad);
  const x2 = Math.min(canvas.width, box.maxX + 1 + pad);
  const y2 = Math.min(canvas.height, box.maxY + 1 + pad);
  const w = Math.max(1, x2 - x);
  const h = Math.max(1, y2 - y);
  if (w >= canvas.width && h >= canvas.height) return canvas;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const outCtx = out.getContext("2d");
  if (!outCtx) return canvas;
  outCtx.fillStyle = PAPER;
  outCtx.fillRect(0, 0, w, h);
  outCtx.drawImage(canvas, x, y, w, h, 0, 0, w, h);
  return out;
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error("Could not render PNG"));
      else resolve(blob);
    }, "image/png");
  });
}

type Capture = { png: Blob; pixelWidth: number; pixelHeight: number };

async function captureEquation(wrapper: HTMLElement): Promise<Capture> {
  const host = mountFresh(wrapper);
  try {
    await waitKatexFonts();
    await nextFrame();
    const katexEl = host.querySelector<HTMLElement>(".katex");
    if (!katexEl) throw new Error("No rendered equation");
    const box = unionBox(katexEl);
    const cssW = Math.max(1, Math.ceil(box.right - box.left) + PAD * 2);
    const cssH = Math.max(1, Math.ceil(box.bottom - box.top) + PAD * 2);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(cssW * SCALE));
    canvas.height = Math.max(1, Math.round(cssH * SCALE));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not create canvas");
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(SCALE, SCALE);
    ctx.translate(PAD - box.left, PAD - box.top);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    paintNode(ctx, katexEl);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const trimmed = trimCanvas(canvas, ctx);
    const png = await canvasToPng(trimmed);
    return {
      png,
      pixelWidth: trimmed.width,
      pixelHeight: trimmed.height,
    };
  } finally {
    host.remove();
  }
}

function pngToSvg(pngDataUrl: string, width: number, height: number): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<image href="${pngDataUrl}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet"/>` +
    `</svg>`
  );
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not encode PNG"));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(blob);
  });
}

export function svgMarkupFromDataUrl(dataUrl: string): string {
  const comma = dataUrl.indexOf(",");
  const payload = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  if (dataUrl.includes(";base64,")) {
    const bytes = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8").decode(bytes);
  }
  return decodeURIComponent(payload);
}

async function captureWithTimeout(wrapper: HTMLElement): Promise<Capture> {
  return Promise.race([
    captureEquation(wrapper),
    new Promise<never>((_, reject) => {
      window.setTimeout(
        () => reject(new Error("Equation snapshot timed out")),
        8000,
      );
    }),
  ]);
}

export async function equationToPngBlob(wrapper: HTMLElement): Promise<Blob> {
  const { png } = await captureWithTimeout(wrapper);
  return png;
}

export async function equationToSvgMarkup(wrapper: HTMLElement): Promise<string> {
  const { png, pixelWidth, pixelHeight } = await captureWithTimeout(wrapper);
  const dataUrl = await blobToDataUrl(png);
  return pngToSvg(dataUrl, pixelWidth, pixelHeight);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function writePng(blob: Blob): Promise<boolean> {
  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return true;
  } catch {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": Promise.resolve(blob) }),
      ]);
      return true;
    } catch {
      return false;
    }
  }
}

export type EquationImageResult = "copied" | "downloaded" | "failed";

export async function copyEquationPng(
  wrapper: HTMLElement,
): Promise<EquationImageResult> {
  try {
    const blob = await equationToPngBlob(wrapper);
    if (await writePng(blob)) return "copied";
    downloadBlob(blob, "equation.png");
    return "downloaded";
  } catch {
    return "failed";
  }
}

export async function copyEquationSvg(
  wrapper: HTMLElement,
): Promise<EquationImageResult> {
  try {
    const svg = await equationToSvgMarkup(wrapper);
    try {
      await navigator.clipboard.writeText(svg);
      return "copied";
    } catch {
      downloadBlob(new Blob([svg], { type: "image/svg+xml" }), "equation.svg");
      return "downloaded";
    }
  } catch {
    return "failed";
  }
}
