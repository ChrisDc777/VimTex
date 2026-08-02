"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SidePanelHeader } from "@/components/SidePanelHeader";
import { renderNoteToHtml } from "@/lib/render-note";

type LatexPreviewProps = {
  note: string;
  debounceMs?: number;
};

async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fall through to legacy path */
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

export function LatexPreview({ note, debounceMs = 75 }: LatexPreviewProps) {
  const [html, setHtml] = useState(() => renderNoteToHtml(note));
  const latest = useRef(note);
  latest.current = note;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setHtml(renderNoteToHtml(latest.current));
    }, debounceMs);
    return () => window.clearTimeout(id);
  }, [note, debounceMs]);

  const markup = useMemo(() => ({ __html: html }), [html]);

  // Click / hover-to-copy rendered equations (fine pointers only). Attaches
  // once; the scroll container is stable across renders.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    if (!window.matchMedia?.("(hover: hover)").matches) return;

    let button: HTMLButtonElement | null = null;
    let current: HTMLElement | null = null;
    let feedbackTimer: number | undefined;

    const ensureButton = () => {
      if (button) return button;
      const el = document.createElement("button");
      el.type = "button";
      el.className = "vt-copy-equation";
      el.textContent = "Copy";
      el.setAttribute("aria-label", "Copy equation source");
      el.addEventListener("click", (event) => {
        event.stopPropagation();
        const tex = current?.getAttribute("data-tex") ?? "";
        if (!tex) return;
        void copyText(tex);
        flashCopied(el);
      });
      button = el;
      document.body.appendChild(el);
      return el;
    };

    const flashCopied = (el: HTMLButtonElement) => {
      el.textContent = "Copied";
      window.clearTimeout(feedbackTimer);
      feedbackTimer = window.setTimeout(() => {
        el.textContent = "Copy";
      }, 1200);
    };

    const positionButton = (el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      const btn = ensureButton();
      btn.style.display = "block";
      btn.style.top = `${Math.max(8, rect.top - 32)}px`;
      btn.style.left = `${Math.min(
        window.innerWidth - 72,
        Math.max(8, rect.right - 64),
      )}px`;
    };

    const hideButton = () => {
      current = null;
      if (button) button.style.display = "none";
    };

    const onMouseOver = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest?.(".vt-copy-equation")) return;
      const wrapper = target.closest?.<HTMLElement>(".vt-tex-src");
      if (wrapper && wrapper !== current) {
        current = wrapper;
        positionButton(wrapper);
      } else if (!wrapper) {
        hideButton();
      }
    };

    const onScroll = () => hideButton();
    const onMouseDown = (event: MouseEvent) => {
      if (button && event.target === button) return;
      hideButton();
    };

    // Clicking an equation copies its TeX source directly.
    const onClick = (event: MouseEvent) => {
      if (event.target === button) return;
      const wrapper = (event.target as HTMLElement).closest?.<HTMLElement>(
        ".vt-tex-src",
      );
      if (!wrapper) return;
      const tex = wrapper.getAttribute("data-tex") ?? "";
      if (!tex) return;
      void copyText(tex);
      current = wrapper;
      const btn = ensureButton();
      btn.style.display = "block";
      positionButton(wrapper);
      flashCopied(btn);
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
      button?.remove();
      button = null;
      current = null;
    };
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SidePanelHeader title="Preview" />
      <div
        ref={scrollRef}
        className="latex-preview min-h-0 flex-1 overflow-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5"
        dangerouslySetInnerHTML={markup}
      />
    </div>
  );
}
