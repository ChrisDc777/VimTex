"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clampMobileBottomHeight,
  clampPaneWidth,
  defaultMobileBottomHeight,
  fitPaneLayoutToViewport,
  isMobileLayout,
  loadPaneLayout,
  PANE_DEFAULTS,
  savePaneLayout,
  type PaneId,
  type PaneLayout,
  type PaneOpenState,
} from "@/lib/pane-layout";
import { useVisualViewport } from "@/lib/use-visual-viewport";

type UsePaneLayoutOptions = {
  open: PaneOpenState;
};

export function usePaneLayout({ open }: UsePaneLayoutOptions) {
  const [layout, setLayout] = useState<PaneLayout>(PANE_DEFAULTS);
  const [hydrated, setHydrated] = useState(false);
  const viewportRef = useRef({ width: 1280, height: 800 });
  const openRef = useRef(open);
  const savedMobileHeightRef = useRef<number | null>(null);
  const { keyboardOpen, height: visualHeight } = useVisualViewport();

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const fitToViewport = useCallback(
    (current: PaneLayout, viewportWidth = viewportRef.current.width) =>
      fitPaneLayoutToViewport(current, viewportWidth, openRef.current),
    [],
  );

  useEffect(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    viewportRef.current = { width, height };

    const loaded = loadPaneLayout();
    const next = { ...loaded };
    if (isMobileLayout(width) && loaded.mobileBottomHeight === PANE_DEFAULTS.mobileBottomHeight) {
      next.mobileBottomHeight = defaultMobileBottomHeight(height);
    }

    setLayout(fitToViewport(next));
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

  useEffect(() => {
    if (!hydrated || !open.right) return;

    if (keyboardOpen) {
      setLayout((current) => {
        if (savedMobileHeightRef.current == null) {
          savedMobileHeightRef.current = current.mobileBottomHeight;
        }
        const capped = clampMobileBottomHeight(
          Math.round(visualHeight * 0.25),
          viewportRef.current.height,
        );
        if (capped === current.mobileBottomHeight) return current;
        return { ...current, mobileBottomHeight: capped };
      });
      return;
    }

    if (savedMobileHeightRef.current != null) {
      const restored = savedMobileHeightRef.current;
      savedMobileHeightRef.current = null;
      setLayout((current) => {
        const clamped = clampMobileBottomHeight(
          restored,
          viewportRef.current.height,
        );
        if (clamped === current.mobileBottomHeight) return current;
        return { ...current, mobileBottomHeight: clamped };
      });
    }
  }, [keyboardOpen, visualHeight, hydrated, open.right]);

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
