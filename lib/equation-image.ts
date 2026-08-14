/**
 * Snapshot a KaTeX equation as PNG / SVG by re-rendering the TeX on a light
 * host. html-to-image copies computed styles onto every node and that breaks
 * KaTeX .vlist layout (fractions / sqrts collapse to empty).
 */

import { renderMathToHtml } from "./render-note.ts";

const INK = "#111111";
const PAPER = "#ffffff";
/** Padding inside the HTML snapshot, in CSS pixels. */
const PAD = 24;
/** Extra foreignObject slack — Chrome clips FO even with overflow:visible. */
const FO_SLACK = 96;
/** Padding kept after trimming white canvas edges, in CSS pixels. */
const TRIM_PAD = 16;
const SCALE = 2;
/** RGB at or above this is treated as paper when trimming. */
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

let cssCache: Promise<string> | null = null;

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

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

async function fetchOk(
  url: string,
  ms = 2000,
): Promise<Response | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(ms) });
    if (!res.ok) return null;
    return res;
  } catch {
    return null;
  }
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

async function inlineFontUrls(
  cssText: string,
  baseHref: string | null,
): Promise<string> {
  const urlRe = /url\((['"]?)([^)'"]+)\1\)/g;
  const matches = [...cssText.matchAll(urlRe)];
  const replacements = await Promise.all(
    matches.map(async (match) => {
      const raw = match[2];
      if (!raw || raw.startsWith("data:")) return null;
      const abs = new URL(raw, baseHref || document.baseURI).href;
      const res = await fetchOk(abs);
      if (!res) return null;
      const mime = res.headers.get("content-type") || "font/woff2";
      const b64 = arrayBufferToBase64(await res.arrayBuffer());
      return { from: match[0], to: `url("data:${mime};base64,${b64}")` };
    }),
  );
  let out = cssText;
  for (const rep of replacements) {
    if (rep) out = out.split(rep.from).join(rep.to);
  }
  return dropExternalCssUrls(out);
}

function allStyleSheets(): CSSStyleSheet[] {
  const sheets: CSSStyleSheet[] = [];
  for (const sheet of Array.from(document.styleSheets)) sheets.push(sheet);
  if (document.adoptedStyleSheets) {
    for (const sheet of document.adoptedStyleSheets) sheets.push(sheet);
  }
  return sheets;
}

function* walkRules(rules: CSSRuleList): Generator<CSSRule> {
  for (const rule of Array.from(rules)) {
    yield rule;
    const sheet = (rule as CSSImportRule).styleSheet;
    if (sheet) {
      try {
        yield* walkRules(sheet.cssRules);
      } catch {
        /* cross-origin import */
      }
      continue;
    }
    const grouped = rule as CSSGroupingRule;
    if (grouped.cssRules) {
      try {
        yield* walkRules(grouped.cssRules);
      } catch {
        /* unreadable group */
      }
    }
  }
}

async function cssFromRules(): Promise<string> {
  const parts: string[] = [];
  for (const sheet of allStyleSheets()) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of walkRules(rules)) {
      if (!/katex|KaTeX/i.test(rule.cssText)) continue;
      parts.push(await inlineFontUrls(rule.cssText, sheet.href));
    }
  }
  return parts.join("\n");
}

async function cssFromFetchedSheets(): Promise<string> {
  const hrefs = new Set<string>();
  for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
    if (link instanceof HTMLLinkElement && link.href) hrefs.add(link.href);
  }
  for (const sheet of allStyleSheets()) {
    if (sheet.href) hrefs.add(sheet.href);
  }
  const parts: string[] = [];
  for (const style of document.querySelectorAll("style")) {
    const text = style.textContent ?? "";
    if (!/katex|KaTeX/i.test(text)) continue;
    parts.push(await inlineFontUrls(extractKatexCss(text), null));
  }
  for (const href of hrefs) {
    const res = await fetchOk(href, 2500);
    if (!res) continue;
    const text = await res.text();
    if (!/katex|KaTeX/i.test(text)) continue;
    parts.push(await inlineFontUrls(extractKatexCss(text), href));
  }
  return parts.join("\n");
}

/** KaTeX CSS + inlined fonts. Skips unreadable sheets (no console error). */
export async function collectEquationCss(): Promise<string> {
  if (cssCache) return cssCache;
  cssCache = (async () => {
    let body = await cssFromRules();
    if (!/vlist/i.test(body)) {
      body += `\n${await cssFromFetchedSheets()}`;
    }
    return [
      dropExternalCssUrls(body),
      `.katex,.katex *{color:${INK}!important}`,
      `.katex,.katex-display,.katex-html,.katex-display>.katex{overflow:visible!important;margin:0!important;max-width:none!important}`,
      `.katex{white-space:nowrap!important}`,
      `.katex-mathml{display:none!important}`,
    ].join("\n");
  })();
  return cssCache;
}

function unionSize(el: HTMLElement): { width: number; height: number } {
  const origin = el.getBoundingClientRect();
  let minL = origin.left;
  let minT = origin.top;
  let maxR = origin.right;
  let maxB = origin.bottom;
  const visit = (node: Element) => {
    for (const r of node.getClientRects()) {
      minL = Math.min(minL, r.left);
      minT = Math.min(minT, r.top);
      maxR = Math.max(maxR, r.right);
      maxB = Math.max(maxB, r.bottom);
    }
    if (node instanceof HTMLElement) {
      maxR = Math.max(maxR, minL + node.scrollWidth);
      maxB = Math.max(maxB, minT + node.scrollHeight);
    }
  };
  visit(el);
  for (const node of el.querySelectorAll("*")) visit(node);
  return {
    width: Math.max(1, maxR - minL, el.scrollWidth, el.offsetWidth),
    height: Math.max(1, maxB - minT, el.scrollHeight, el.offsetHeight),
  };
}

/** Bounding box of non-paper pixels. Used to crop FO slack after rasterizing. */
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
  // Use the wrapper size, not .katex's computed px — that already includes
  // KaTeX's 1.21em, and setting it on the host would apply 1.21em twice.
  host.style.fontSize = getComputedStyle(wrapper).fontSize;
  host.innerHTML = html;
  host.querySelector(".katex-mathml")?.remove();
  document.body.appendChild(host);
  return host;
}

function equationSvgMarkup(
  xhtml: string,
  width: number,
  height: number,
): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" overflow="visible">` +
    `<foreignObject x="0" y="0" width="${width}" height="${height}" overflow="visible">${xhtml}</foreignObject>` +
    `</svg>`
  );
}

type Raster = { blob: Blob; pixelWidth: number; pixelHeight: number };

async function rasterizeSvg(
  svg: string,
  width: number,
  height: number,
): Promise<Raster> {
  const url = URL.createObjectURL(
    new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
  );
  try {
    const img = new Image();
    img.decoding = "sync";
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(
        () => reject(new Error("Could not rasterize equation")),
        8000,
      );
      img.onload = () => {
        window.clearTimeout(timer);
        resolve();
      };
      img.onerror = () => {
        window.clearTimeout(timer);
        reject(new Error("Could not rasterize equation"));
      };
      img.src = url;
    });
    await img.decode?.().catch(() => undefined);
    const pixelWidth = Math.max(1, Math.round(width * SCALE));
    const pixelHeight = Math.max(1, Math.round(height * SCALE));
    const canvas = document.createElement("canvas");
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not create canvas");
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, pixelWidth, pixelHeight);
    ctx.drawImage(img, 0, 0, pixelWidth, pixelHeight);
    const trimmed = trimCanvas(canvas, ctx);
    const blob = await canvasToPng(trimmed.canvas);
    return {
      blob,
      pixelWidth: trimmed.canvas.width,
      pixelHeight: trimmed.canvas.height,
    };
  } finally {
    URL.revokeObjectURL(url);
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

type Capture = { png: Blob; pixelWidth: number; pixelHeight: number };

function trimCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
): { canvas: HTMLCanvasElement } {
  let box: ReturnType<typeof contentBoundingBox> = null;
  try {
    box = contentBoundingBox(
      ctx.getImageData(0, 0, canvas.width, canvas.height).data,
      canvas.width,
      canvas.height,
    );
  } catch {
    return { canvas };
  }
  if (!box) return { canvas };
  const pad = TRIM_PAD * SCALE;
  const x = Math.max(0, box.minX - pad);
  const y = Math.max(0, box.minY - pad);
  const x2 = Math.min(canvas.width, box.maxX + 1 + pad);
  const y2 = Math.min(canvas.height, box.maxY + 1 + pad);
  const w = Math.max(1, x2 - x);
  const h = Math.max(1, y2 - y);
  if (w >= canvas.width && h >= canvas.height) return { canvas };
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const outCtx = out.getContext("2d");
  if (!outCtx) return { canvas };
  outCtx.fillStyle = PAPER;
  outCtx.fillRect(0, 0, w, h);
  outCtx.drawImage(canvas, x, y, w, h, 0, 0, w, h);
  return { canvas: out };
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error("Could not render PNG"));
      else resolve(blob);
    }, "image/png");
  });
}

async function captureEquation(wrapper: HTMLElement): Promise<Capture> {
  const host = mountFresh(wrapper);
  try {
    await waitKatexFonts();
    await nextFrame();
    const katexEl = host.querySelector<HTMLElement>(".katex");
    if (!katexEl) throw new Error("No rendered equation");
    const inner = unionSize(katexEl);
    // FO always clips in Chromium; size the viewport larger than the math,
    // then trim white edges after rasterizing.
    const width = Math.ceil(inner.width * 1.4) + PAD * 2 + FO_SLACK;
    const height = Math.ceil(inner.height * 1.4) + PAD * 2 + FO_SLACK;
    const fontSize = getComputedStyle(wrapper).fontSize;

    const css = await collectEquationCss();
    const box = document.createElement("div");
    box.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
    box.setAttribute(
      "style",
      [
        `background:${PAPER}`,
        `color:${INK}`,
        `padding:${PAD}px`,
        "box-sizing:content-box",
        "display:inline-block",
        "width:max-content",
        "max-width:none",
        `min-width:${Math.ceil(inner.width)}px`,
        "white-space:nowrap",
        `font-size:${fontSize}`,
        "overflow:visible",
      ].join(";"),
    );
    const style = document.createElement("style");
    style.textContent = css;
    box.appendChild(style);
    box.appendChild(katexEl.cloneNode(true));
    const xhtml = new XMLSerializer().serializeToString(box);
    const raster = await rasterizeSvg(
      equationSvgMarkup(xhtml, width, height),
      width,
      height,
    );
    return {
      png: raster.blob,
      pixelWidth: raster.pixelWidth,
      pixelHeight: raster.pixelHeight,
    };
  } finally {
    host.remove();
  }
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
        12000,
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
