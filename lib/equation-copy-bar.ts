/**
 * Hover / click copy bar on preview equations: TeX, SVG, PNG.
 * Fixed overlay that overlaps the equation so there is no hover gap.
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
  let hideTimer: number | undefined;
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
    tex.textContent = "TeX";
    tex.setAttribute("aria-label", "Copy equation as TeX");
    tex.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const source = current?.getAttribute("data-tex") ?? "";
      if (!source) return;
      void copyText(source);
      flashCopied();
    });

    const svg = makeFmtButton("SVG", "Copy equation as SVG");
    svg.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void copyImage("svg");
    });

    const png = makeFmtButton("PNG", "Copy equation as PNG");
    png.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void copyImage("png");
    });

    wrap.append(tex, svg, png);
    wrap.addEventListener("pointerenter", cancelHide);
    wrap.addEventListener("pointerleave", (event) => {
      if (wrapperFrom(event.relatedTarget) === current) return;
      scheduleHide();
    });
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
      if (texBtn) texBtn.textContent = "TeX";
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

  const cancelHide = () => {
    window.clearTimeout(hideTimer);
    hideTimer = undefined;
  };

  const hideBar = () => {
    cancelHide();
    current = null;
    if (bar) bar.style.display = "none";
  };

  const scheduleHide = () => {
    cancelHide();
    hideTimer = window.setTimeout(hideBar, 280);
  };

  const positionBar = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const toolbar = ensureBar();
    toolbar.style.display = "flex";
    const barWidth = toolbar.offsetWidth || 168;
    const barHeight = toolbar.offsetHeight || 36;
    // Sit just above the equation with ~10px overlap so the pointer never
    // crosses an empty gap, without covering the click target.
    const overlap = 10;
    const top = Math.max(4, rect.top - barHeight + overlap);
    const left = Math.min(
      window.innerWidth - barWidth - 8,
      Math.max(8, rect.right - barWidth + 8),
    );
    toolbar.style.top = `${top}px`;
    toolbar.style.left = `${left}px`;
  };

  const showOn = (wrapper: HTMLElement) => {
    cancelHide();
    current = wrapper;
    positionBar(wrapper);
  };

  const wrapperFrom = (node: EventTarget | null): HTMLElement | null => {
    if (!(node instanceof Element)) return null;
    if (node.closest(".vt-copy-equation-bar")) return current;
    const wrapper = node.closest<HTMLElement>(".vt-tex-src");
    if (!wrapper || !container.contains(wrapper)) return null;
    return wrapper;
  };

  const onPointerOver = (event: PointerEvent) => {
    const wrapper = wrapperFrom(event.target);
    if (wrapper) showOn(wrapper);
  };

  const onPointerOut = (event: PointerEvent) => {
    if (wrapperFrom(event.relatedTarget) === current) return;
    if (event.relatedTarget instanceof Element) {
      if (event.relatedTarget.closest(".vt-copy-equation-bar")) {
        cancelHide();
        return;
      }
    }
    if (wrapperFrom(event.target) === current) scheduleHide();
  };

  const onScroll = () => {
    if (current) positionBar(current);
  };

  const onClick = (event: MouseEvent) => {
    if ((event.target as HTMLElement).closest?.(".vt-copy-equation-bar")) return;
    const wrapper = wrapperFrom(event.target);
    if (!wrapper) return;
    const tex = wrapper.getAttribute("data-tex") ?? "";
    if (!tex) return;
    void copyText(tex);
    showOn(wrapper);
    flashCopied();
  };

  container.addEventListener("pointerover", onPointerOver);
  container.addEventListener("pointerout", onPointerOut);
  container.addEventListener("scroll", onScroll, true);
  container.addEventListener("click", onClick);

  return () => {
    container.removeEventListener("pointerover", onPointerOver);
    container.removeEventListener("pointerout", onPointerOut);
    container.removeEventListener("scroll", onScroll, true);
    container.removeEventListener("click", onClick);
    window.clearTimeout(feedbackTimer);
    cancelHide();
    bar?.remove();
    bar = null;
    texBtn = null;
    current = null;
  };
}
