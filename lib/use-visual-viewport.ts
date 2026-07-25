"use client";

import { useEffect, useState } from "react";

export type VisualViewportState = {
  height: number;
  offsetTop: number;
  keyboardOpen: boolean;
};

const KEYBOARD_THRESHOLD = 0.75;

function readViewport(): VisualViewportState {
  if (typeof window === "undefined") {
    return { height: 800, offsetTop: 0, keyboardOpen: false };
  }

  const vv = window.visualViewport;
  const height = vv?.height ?? window.innerHeight;
  const offsetTop = vv?.offsetTop ?? 0;
  const keyboardOpen = height < window.innerHeight * KEYBOARD_THRESHOLD;

  return { height, offsetTop, keyboardOpen };
}

export function useVisualViewport(): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>(readViewport);

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
