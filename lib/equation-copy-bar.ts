/**
 * Hover / click copy bar on preview equations: TeX (existing), SVG, PNG.
 */

import { copyEquationPng, copyEquationSvg } from "./equation-image.ts";
import { notify } from "./toasts.ts";

async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fall through */
    }
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

function reportImageResult(
  result: "copied" | "downloaded" | "failed",
  kind: "PNG" | "SVG",
): void {
  if (result === "copied") notify.success(`Copied equation ${kind}`);
  else if (result === "downloaded") notify.success(`Downloaded equation ${kind}`);
  else notify.error(`Could not copy equation ${kind}`);
}

/** Attach preview equation copy UI. Returns a disposer. */
export function attachEquationCopyBar(container: HTMLElement): () => void {
  if (!window.matchMedia?.("(hover: hover)").matches) {
    return () => {};
  }

  let bar: HTMLDivElement | null = null;
  let texBtn: HTMLButtonElement | null = null;
  let current: HTMLElement | null = null;
  let feedbackTimer: number | undefined;
  let busy = false;

  const makeFmtButton = (label: string, aria: string) => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "vt-copy-equation-fmt";
    el.textContent = label;
    el.setAttribute("aria-label", aria);
    return el;
  };

  const ensureBar = () => {
    if (bar) return bar;
    const wrap = document.createElement("div");
    wrap.className = "vt-copy-equation-bar";
    wrap.setAttribute("role", "toolbar");
    wrap.setAttribute("aria-label", "Copy equation");

    const tex = document.createElement("button");
    tex.type = "button";
    tex.className = "vt-copy-equation";
    tex.textContent = "Copy";
    tex.setAttribute("aria-label", "Copy equation source");
    tex.addEventListener("click", (event) => {
      event.stopPropagation();
      const source = current?.getAttribute("data-tex") ?? "";
      if (!source) return;
      void copyText(source);
      flashCopied();
    });

    const svg = makeFmtButton("SVG", "Copy equation as SVG");
    svg.addEventListener("click", (event) => {
      event.stopPropagation();
      void copyImage("svg");
    });

    const png = makeFmtButton("PNG", "Copy equation as PNG");
    png.addEventListener("click", (event) => {
      event.stopPropagation();
      void copyImage("png");
    });

    wrap.append(tex, svg, png);
    document.body.appendChild(wrap);
    bar = wrap;
    texBtn = tex;
    return wrap;
  };

  const flashCopied = () => {
    if (!texBtn) return;
    texBtn.textContent = "Copied";
    window.clearTimeout(feedbackTimer);
    feedbackTimer = window.setTimeout(() => {
      if (texBtn) texBtn.textContent = "Copy";
    }, 1200);
  };

  const copyImage = async (kind: "png" | "svg") => {
    if (!current || busy) return;
    if (current.querySelector(".math-error")) {
      notify.error("That equation has a render error");
      return;
    }
    busy = true;
    try {
      const result =
        kind === "png"
          ? await copyEquationPng(current)
          : await copyEquationSvg(current);
      reportImageResult(result, kind === "png" ? "PNG" : "SVG");
    } finally {
      busy = false;
    }
  };

  const positionBar = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const toolbar = ensureBar();
    toolbar.style.display = "flex";
    toolbar.style.top = `${Math.max(8, rect.top - 40)}px`;
    toolbar.style.left = `${Math.min(
      window.innerWidth - 168,
      Math.max(8, rect.right - 156),
    )}px`;
  };

  const hideBar = () => {
    current = null;
    if (bar) bar.style.display = "none";
  };

  const onMouseOver = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest?.(".vt-copy-equation-bar")) return;
    const wrapper = target.closest?.<HTMLElement>(".vt-tex-src");
    if (wrapper && wrapper !== current) {
      current = wrapper;
      positionBar(wrapper);
    } else if (!wrapper) {
      hideBar();
    }
  };

  const onScroll = () => hideBar();
  const onMouseDown = (event: MouseEvent) => {
    if ((event.target as HTMLElement).closest?.(".vt-copy-equation-bar")) return;
    hideBar();
  };

  const onClick = (event: MouseEvent) => {
    if ((event.target as HTMLElement).closest?.(".vt-copy-equation-bar")) return;
    const wrapper = (event.target as HTMLElement).closest?.<HTMLElement>(
      ".vt-tex-src",
    );
    if (!wrapper) return;
    const tex = wrapper.getAttribute("data-tex") ?? "";
    if (!tex) return;
    void copyText(tex);
    current = wrapper;
    ensureBar();
    positionBar(wrapper);
    flashCopied();
  };

  container.addEventListener("mouseover", onMouseOver);
  container.addEventListener("scroll", onScroll, true);
  container.addEventListener("mousedown", onMouseDown);
  container.addEventListener("click", onClick);

  return () => {
    container.removeEventListener("mouseover", onMouseOver);
    container.removeEventListener("scroll", onScroll, true);
    container.removeEventListener("mousedown", onMouseDown);
    container.removeEventListener("click", onClick);
    window.clearTimeout(feedbackTimer);
    bar?.remove();
    bar = null;
    texBtn = null;
    current = null;
  };
}
