/**
 * Snapshot a rendered KaTeX node as PNG / SVG.
 * Embeds KaTeX fonts without html-to-image's cssRules walk (that throws on
 * extension / cross-origin stylesheets). Pads the frame so glyphs are not cropped.
 */

import { toBlob, toCanvas } from "html-to-image";

const INK = "#111111";
const PAPER = "#ffffff";
const PAD = 16;

let fontCssCache: Promise<string> | null = null;

function katexRoot(wrapper: HTMLElement): HTMLElement | null {
  return wrapper.querySelector<HTMLElement>(".katex");
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function inlineFontUrls(cssText: string, baseHref: string | null): Promise<string> {
  const urlRe = /url\((['"]?)([^)'"]+)\1\)/g;
  const matches = [...cssText.matchAll(urlRe)];
  let out = cssText;
  for (const match of matches) {
    const raw = match[2];
    if (!raw || raw.startsWith("data:")) continue;
    try {
      const abs = new URL(raw, baseHref || document.baseURI).href;
      const res = await fetch(abs);
      if (!res.ok) continue;
      const mime = res.headers.get("content-type") || "font/woff2";
      const b64 = arrayBufferToBase64(await res.arrayBuffer());
      out = out.split(match[0]).join(`url("data:${mime};base64,${b64}")`);
    } catch {
      /* keep original url */
    }
  }
  return out;
}

/** KaTeX @font-face only. Skips sheets we cannot read (no console error). */
export async function embedKatexFontCss(): Promise<string> {
  if (fontCssCache) return fontCssCache;
  fontCssCache = (async () => {
    const chunks: string[] = [];
    const seen = new Set<string>();
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      const baseHref = sheet.href;
      for (const rule of Array.from(rules)) {
        if (!(rule instanceof CSSFontFaceRule)) continue;
        if (!/KaTeX/i.test(rule.style.fontFamily)) continue;
        const key = rule.cssText;
        if (seen.has(key)) continue;
        seen.add(key);
        chunks.push(await inlineFontUrls(key, baseHref));
      }
    }
    return chunks.join("\n");
  })();
  return fontCssCache;
}

function paintInk(root: HTMLElement): void {
  root.querySelector(".katex-mathml")?.remove();
  root.style.setProperty("color", INK, "important");
  root.style.setProperty("overflow", "visible", "important");
  root.style.setProperty("max-width", "none", "important");
  const display = root.querySelector<HTMLElement>(".katex-display");
  if (display) {
    display.style.setProperty("overflow", "visible", "important");
  }
}

function unionContentSize(el: HTMLElement): { width: number; height: number } {
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
  };
  visit(el);
  for (const node of el.querySelectorAll("*")) visit(node);
  return {
    width: Math.max(1, maxR - minL, el.scrollWidth, el.offsetWidth),
    height: Math.max(1, maxB - minT, el.scrollHeight, el.offsetHeight),
  };
}

async function nextFrame(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

type Snapshot = {
  host: HTMLElement;
  width: number;
  height: number;
  fontEmbedCSS: string;
};

async function mountSnapshot(wrapper: HTMLElement): Promise<Snapshot> {
  const live = katexRoot(wrapper);
  if (!live) throw new Error("No rendered equation");
  await document.fonts.ready;
  const fontEmbedCSS = await embedKatexFontCss();

  const host = document.createElement("div");
  host.className = "vt-equation-export-host";
  const target = live.cloneNode(true) as HTMLElement;
  paintInk(target);
  const liveSize = window.getComputedStyle(live).fontSize;
  if (liveSize) target.style.fontSize = liveSize;
  host.appendChild(target);
  document.body.appendChild(host);
  void host.offsetWidth;
  await nextFrame();

  const inner = unionContentSize(target);
  const width = Math.ceil(inner.width) + PAD * 2;
  const height = Math.ceil(inner.height) + PAD * 2;
  host.style.width = `${width}px`;
  host.style.height = `${height}px`;
  return { host, width, height, fontEmbedCSS };
}

function snapshotOptions(snap: Snapshot) {
  return {
    backgroundColor: PAPER,
    pixelRatio: 2,
    width: snap.width,
    height: snap.height,
    fontEmbedCSS: snap.fontEmbedCSS,
    skipFonts: true,
    cacheBust: false,
    style: {
      color: INK,
      backgroundColor: PAPER,
      transform: "none",
      overflow: "visible",
      inset: "auto",
      left: "0",
      top: "0",
      margin: "0",
    } as Partial<CSSStyleDeclaration>,
  };
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

function pngToSvg(pngDataUrl: string, width: number, height: number): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<image href="${pngDataUrl}" width="${width}" height="${height}"/>` +
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

async function pngNaturalSize(blob: Blob): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(blob);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not read PNG"));
      img.src = url;
    });
    return { width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function equationToPngBlob(wrapper: HTMLElement): Promise<Blob> {
  const snap = await mountSnapshot(wrapper);
  try {
    const blob = await toBlob(snap.host, snapshotOptions(snap));
    if (blob && blob.size > 0) return blob;
    const canvas = await toCanvas(snap.host, snapshotOptions(snap));
    const fromCanvas = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/png");
    });
    if (!fromCanvas || fromCanvas.size === 0) {
      throw new Error("Could not render PNG");
    }
    return fromCanvas;
  } finally {
    snap.host.remove();
  }
}

export async function equationToSvgMarkup(wrapper: HTMLElement): Promise<string> {
  const png = await equationToPngBlob(wrapper);
  const { width, height } = await pngNaturalSize(png);
  const dataUrl = await blobToDataUrl(png);
  return pngToSvg(dataUrl, width, height);
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
