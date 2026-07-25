"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clampMobileBottomHeight,
  clampPaneWidth,
  loadPaneLayout,
  PANE_DEFAULTS,
  savePaneLayout,
  type PaneId,
  type PaneLayout,
  type PaneOpenState,
} from "@/lib/pane-layout";

type UsePaneLayoutOptions = {
  open: PaneOpenState;
};

export function usePaneLayout({ open }: UsePaneLayoutOptions) {
  const [layout, setLayout] = useState<PaneLayout>(PANE_DEFAULTS);
  const [hydrated, setHydrated] = useState(false);
  const viewportRef = useRef({ width: 1280, height: 800 });

  useEffect(() => {
    setLayout(loadPaneLayout());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    savePaneLayout(layout);
  }, [layout, hydrated]);

  useEffect(() => {
    const updateViewport = () => {
      viewportRef.current = {
        width: window.innerWidth,
        height: window.innerHeight,
      };
    };
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const resizePane = useCallback(
    (pane: PaneId, delta: number) => {
      setLayout((current) => {
        const nextWidth = current[pane] + delta;
        const clamped = clampPaneWidth(
          pane,
          nextWidth,
          current,
          viewportRef.current.width,
          open,
        );
        if (clamped === current[pane]) return current;
        return { ...current, [pane]: clamped };
      });
    },
    [open],
  );

  const resizeMobileBottom = useCallback((delta: number) => {
    setLayout((current) => {
      const nextHeight = current.mobileBottomHeight + delta;
      const clamped = clampMobileBottomHeight(
        nextHeight,
        viewportRef.current.height,
      );
      if (clamped === current.mobileBottomHeight) return current;
      return { ...current, mobileBottomHeight: clamped };
    });
  }, []);

  const resetPane = useCallback((key: keyof PaneLayout) => {
    setLayout((current) => ({
      ...current,
      [key]: PANE_DEFAULTS[key],
    }));
  }, []);

  return {
    layout,
    resizePane,
    resizeMobileBottom,
    resetPane,
  };
}
