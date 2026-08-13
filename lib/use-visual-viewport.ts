"use client";

import { useEffect, useState } from "react";

export type VisualViewportState = {
  height: number;
  offsetTop: number;
  keyboardOpen: boolean;
};

const KEYBOARD_THRESHOLD = 0.75;

const SSR_VIEWPORT: VisualViewportState = {
  height: 800,
  offsetTop: 0,
  keyboardOpen: false,
};

function readViewport(): VisualViewportState {
  if (typeof window === "undefined") return SSR_VIEWPORT;

  const vv = window.visualViewport;
  const height = vv?.height ?? window.innerHeight;
  const offsetTop = vv?.offsetTop ?? 0;
  const keyboardOpen = height < window.innerHeight * KEYBOARD_THRESHOLD;

  return { height, offsetTop, keyboardOpen };
}

export function useVisualViewport(): VisualViewportState {
  // Always start from the SSR snapshot. Reading window during the first client
  // render makes inline layout styles diverge from server HTML.
  const [state, setState] = useState<VisualViewportState>(SSR_VIEWPORT);

  useEffect(() => {
    const update = () => setState(readViewport());
    update();

    const vv = window.visualViewport;
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);

    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return state;
}
