"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clampStudioPreviewMobileHeight,
  clampStudioPreviewWidth,
  loadStudioSplitLayout,
  saveStudioSplitLayout,
  STUDIO_SPLIT_DEFAULTS,
  type StudioSplitLayout,
} from "@/lib/studio-layout";

export function useStudioSplitLayout(enabled: boolean) {
  const [layout, setLayout] = useState<StudioSplitLayout>(STUDIO_SPLIT_DEFAULTS);
  const [hydrated, setHydrated] = useState(false);
  const viewportRef = useRef({ width: 1280, height: 800 });

  useEffect(() => {
    viewportRef.current = {
      width: window.innerWidth,
      height: window.innerHeight,
    };
    const loaded = loadStudioSplitLayout();
    setLayout({
      previewWidth: clampStudioPreviewWidth(
        loaded.previewWidth,
        viewportRef.current.width,
      ),
      previewMobileHeight: clampStudioPreviewMobileHeight(
        loaded.previewMobileHeight,
        viewportRef.current.height,
      ),
    });
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveStudioSplitLayout(layout);
  }, [layout, hydrated]);

  useEffect(() => {
    if (!hydrated || !enabled) return;
    const updateViewport = () => {
      viewportRef.current = {
        width: window.innerWidth,
        height: window.innerHeight,
      };
      setLayout((current) => ({
        previewWidth: clampStudioPreviewWidth(
          current.previewWidth,
          viewportRef.current.width,
        ),
        previewMobileHeight: clampStudioPreviewMobileHeight(
          current.previewMobileHeight,
          viewportRef.current.height,
        ),
      }));
    };
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, [enabled, hydrated]);

  const resizePreviewWidth = useCallback((delta: number) => {
    setLayout((current) => {
      const next = clampStudioPreviewWidth(
        current.previewWidth + delta,
        viewportRef.current.width,
      );
      if (next === current.previewWidth) return current;
      return { ...current, previewWidth: next };
    });
  }, []);

  const resizePreviewMobileHeight = useCallback((delta: number) => {
    setLayout((current) => {
      const next = clampStudioPreviewMobileHeight(
        current.previewMobileHeight + delta,
        viewportRef.current.height,
      );
      if (next === current.previewMobileHeight) return current;
      return { ...current, previewMobileHeight: next };
    });
  }, []);

  const resetPreviewWidth = useCallback(() => {
    setLayout((current) => ({
      ...current,
      previewWidth: clampStudioPreviewWidth(
        STUDIO_SPLIT_DEFAULTS.previewWidth,
        viewportRef.current.width,
      ),
    }));
  }, []);

  const resetPreviewMobileHeight = useCallback(() => {
    setLayout((current) => ({
      ...current,
      previewMobileHeight: clampStudioPreviewMobileHeight(
        STUDIO_SPLIT_DEFAULTS.previewMobileHeight,
        viewportRef.current.height,
      ),
    }));
  }, []);

  return {
    layout,
    resizePreviewWidth,
    resizePreviewMobileHeight,
    resetPreviewWidth,
    resetPreviewMobileHeight,
  };
}
