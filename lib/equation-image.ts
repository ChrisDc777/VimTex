/**
 * Snapshot a rendered KaTeX node as PNG / SVG for clipboard or download.
 * Light ink + embedded KaTeX fonts — the live preview is dark, so a naive
 * capture produces invisible glyphs on white.
 */

import { getFontEmbedCSS, toBlob, toCanvas } from "html-to-image";

const INK = "#111111";
const PAPER = "#ffffff";

function katexVisible(wrapper: HTMLElement): HTMLElement | null {
  return wrapper.querySelector<HTMLElement>(".katex");
}

function paintInk(root: HTMLElement): void {
  root.querySelector(".katex-mathml")?.remove();
  root.style.setProperty("color", INK, "important");
  root.style.setProperty("-webkit-text-fill-color", INK, "important");
  root.style.setProperty("background-color", "transparent", "important");
  for (const el of root.querySelectorAll<HTMLElement>("*")) {
    el.style.setProperty("color", INK, "important");
    el.style.setProperty("-webkit-text-fill-color", INK, "important");
  }
}

async function nextFrame(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

type Snapshot = {
  host: HTMLElement;
  target: HTMLElement;
  width: number;
  height: number;
  fontEmbedCSS: string;
};

async function mountSnapshot(wrapper: HTMLElement): Promise<Snapshot> {
  const live = katexVisible(wrapper);
  if (!live) throw new Error("No rendered equation");
  const rect = live.getBoundingClientRect();
  await document.fonts.ready;
  const fontEmbedCSS = await getFontEmbedCSS(live);

  const host = document.createElement("div");
  host.className = "vt-equation-export-host";
  const target = live.cloneNode(true) as HTMLElement;
  paintInk(target);
  host.appendChild(target);
  document.body.appendChild(host);
  void host.offsetWidth;
  await nextFrame();

  const width = Math.max(1, Math.ceil(rect.width) || target.offsetWidth);
  const height = Math.max(1, Math.ceil(rect.height) || target.offsetHeight);
  return { host, target, width, height, fontEmbedCSS };
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

function pngToSvg(png: Blob, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not encode PNG"));
    reader.onload = () => {
      const href = String(reader.result ?? "");
      resolve(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
          `<image href="${href}" width="${width}" height="${height}"/>` +
          `</svg>`,
      );
    };
    reader.readAsDataURL(png);
  });
}

export async function equationToPngBlob(wrapper: HTMLElement): Promise<Blob> {
  const snap = await mountSnapshot(wrapper);
  try {
    const blob = await toBlob(snap.target, snapshotOptions(snap));
    if (blob && blob.size > 0) return blob;
    const canvas = await toCanvas(snap.target, snapshotOptions(snap));
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
  const snapLive = katexVisible(wrapper)?.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(snapLive?.width ?? 1));
  const height = Math.max(1, Math.ceil(snapLive?.height ?? 1));
  return pngToSvg(png, width, height);
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
