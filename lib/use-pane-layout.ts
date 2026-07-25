"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clampMobileBottomHeight,
  clampPaneWidth,
  fitPaneLayoutToViewport,
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
  const openRef = useRef(open);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const fitToViewport = useCallback(
    (current: PaneLayout, viewportWidth = viewportRef.current.width) =>
      fitPaneLayoutToViewport(current, viewportWidth, openRef.current),
    [],
  );

  useEffect(() => {
    const loaded = loadPaneLayout();
    viewportRef.current = {
      width: window.innerWidth,
      height: window.innerHeight,
    };
    setLayout(fitToViewport(loaded));
    setHydrated(true);
  }, [fitToViewport]);

  useEffect(() => {
    if (!hydrated) return;
    savePaneLayout(layout);
  }, [layout, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    setLayout((current) => fitToViewport(current));
  }, [open.left, open.right, hydrated, fitToViewport]);

  useEffect(() => {
    const updateViewport = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      viewportRef.current = { width, height };
      setLayout((current) => fitToViewport(current, width));
    };
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, [fitToViewport]);

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

  const resetPane = useCallback(
    (key: keyof PaneLayout) => {
      setLayout((current) =>
        fitToViewport({
          ...current,
          [key]: PANE_DEFAULTS[key],
        }),
      );
    },
    [fitToViewport],
  );

  return {
    layout,
    resizePane,
    resizeMobileBottom,
    resetPane,
  };
}
