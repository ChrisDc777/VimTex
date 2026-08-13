/**
 * Snapshot a rendered KaTeX node as PNG / SVG for clipboard or download.
 * Renders on a light host so pastes work in docs (preview is dark).
 */

import { toBlob, toSvg } from "html-to-image";

const SNAPSHOT_OPTS = {
  backgroundColor: "#ffffff",
  preferredFontFormat: "woff2" as const,
};

function katexRoot(wrapper: HTMLElement): HTMLElement | null {
  return wrapper.querySelector<HTMLElement>(".katex");
}

function mountLightHost(katexEl: HTMLElement): HTMLElement {
  const host = document.createElement("div");
  host.className = "vt-equation-export-host";
  host.setAttribute("aria-hidden", "true");
  host.appendChild(katexEl.cloneNode(true));
  document.body.appendChild(host);
  return host;
}

async function withExportHost<T>(
  wrapper: HTMLElement,
  fn: (host: HTMLElement) => Promise<T>,
): Promise<T> {
  const katex = katexRoot(wrapper);
  if (!katex) throw new Error("No rendered equation");
  await document.fonts.ready;
  const host = mountLightHost(katex);
  try {
    return await fn(host);
  } finally {
    host.remove();
  }
}

export function svgMarkupFromDataUrl(dataUrl: string): string {
  const comma = dataUrl.indexOf(",");
  const payload = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  if (dataUrl.includes(";base64,")) {
    return atob(payload);
  }
  return decodeURIComponent(payload);
}

export async function equationToPngBlob(wrapper: HTMLElement): Promise<Blob> {
  return withExportHost(wrapper, async (host) => {
    const blob = await toBlob(host, { ...SNAPSHOT_OPTS, pixelRatio: 2 });
    if (!blob) throw new Error("Could not render PNG");
    return blob;
  });
}

export async function equationToSvgMarkup(wrapper: HTMLElement): Promise<string> {
  return withExportHost(wrapper, async (host) => {
    const dataUrl = await toSvg(host, SNAPSHOT_OPTS);
    return svgMarkupFromDataUrl(dataUrl);
  });
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
    return false;
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
